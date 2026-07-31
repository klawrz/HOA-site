import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft, Users } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BankInfoCard } from "@/components/key-info/bank-info-card"
import { KeyContactList } from "@/components/key-info/key-contact-list"
import { KeyContactDialog } from "@/components/key-info/key-contact-dialog"

export default async function OwnerBoardKeyInfoPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER" || !session.user.isBoardMember) redirect("/dashboard")

  const [org, contacts] = await Promise.all([
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.keyContact.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/owner/governance/board"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Board Management
        </Link>
        <h1 className="text-2xl font-bold">Key Information</h1>
        <p className="text-gray-500 mt-1">Bank details and the institutional contacts owners rely on</p>
      </div>

      <BankInfoCard
        bank={{
          bankName: org?.bankName ?? null,
          bankAccountName: org?.bankAccountName ?? null,
          bankSigningAuthority: org?.bankSigningAuthority ?? null,
          bankPaymentInstructions: org?.bankPaymentInstructions ?? null,
        }}
        canManage
      />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Key Contacts
          </CardTitle>
          <KeyContactDialog />
        </CardHeader>
        <CardContent>
          <KeyContactList contacts={contacts} canManage />
        </CardContent>
      </Card>
    </div>
  )
}
