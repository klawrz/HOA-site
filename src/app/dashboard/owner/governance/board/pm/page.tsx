import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { PMContractBoard } from "@/components/pm/pm-contract-board"

export default async function OwnerBoardPMPage() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER" || !session.user.isBoardMember) {
    redirect("/dashboard")
  }

  const [contracts, companies, meetings] = await Promise.all([
    db.pMContract.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { company: { include: { emergencyContacts: true } }, createdBy: true, approvedBy: true },
      orderBy: { createdAt: "desc" },
    }),
    db.propertyManagementCompany.findMany({ orderBy: { legalName: "asc" } }),
    db.meeting.findMany({ where: { orgId: session.user.orgId ?? undefined }, orderBy: { date: "desc" } }),
  ])

  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/owner/governance/board"
        className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Board Management
      </Link>

      <PMContractBoard
        contracts={contracts}
        companies={companies.map((c) => ({ id: c.id, legalName: c.legalName }))}
        meetings={meetings.map((m) => ({ id: m.id, title: m.title, date: m.date }))}
        canManage
        canApprove
      />
    </div>
  )
}
