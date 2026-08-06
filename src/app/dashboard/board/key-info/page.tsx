import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { BankInfoCard } from "@/components/key-info/bank-info-card"
import { KeyContactList } from "@/components/key-info/key-contact-list"
import { KeyContactDialog } from "@/components/key-info/key-contact-dialog"
import { PropertyAddressCard } from "@/components/key-info/property-address-card"
import { BoardRosterCard } from "@/components/key-info/board-roster-card"
import { PMKeyContactCard } from "@/components/key-info/pm-key-contact-card"
import { AccountOwnerCard } from "@/components/key-info/account-owner-card"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"

export default async function BoardKeyInfoPage() {
  const session = await auth()
  if (!session || session.user.role !== "BOARD_MEMBER") redirect("/dashboard")

  const [org, contacts, boardPositions, activePMContract, ownMembership] = await Promise.all([
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.keyContact.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      orderBy: [{ category: "asc" }, { sortOrder: "asc" }],
    }),
    db.boardPosition.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { user: true },
      orderBy: { title: "asc" },
    }),
    db.pMContract.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "ACTIVE" },
      include: { company: true },
      orderBy: { startDate: "desc" },
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
  ])
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("board_key_info")

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="board_key_info" alreadyComplete={onboardingStepDone} />
      <div>
        <h1 className="text-2xl font-bold">Key Information</h1>
        <p className="text-gray-500 mt-1">Bank details and the institutional contacts owners rely on</p>
      </div>

      <PropertyAddressCard
        address={{
          addressLine1: org?.addressLine1 ?? null,
          addressLine2: org?.addressLine2 ?? null,
          city: org?.city ?? null,
          state: org?.state ?? null,
          postalCode: org?.postalCode ?? null,
          country: org?.country ?? null,
        }}
      />

      <BankInfoCard
        bank={{
          bankName: org?.bankName ?? null,
          bankAddress: org?.bankAddress ?? null,
          bankPhone: org?.bankPhone ?? null,
          bankAccountName: org?.bankAccountName ?? null,
          bankSigningAuthority: org?.bankSigningAuthority ?? null,
          bankPaymentInstructions: org?.bankPaymentInstructions ?? null,
          bankContactName: org?.bankContactName ?? null,
          bankContactPhone: org?.bankContactPhone ?? null,
          bankContactEmail: org?.bankContactEmail ?? null,
        }}
        canManage
      />

      <BoardRosterCard positions={boardPositions} />

      <PMKeyContactCard company={activePMContract?.company ?? null} />

      <AccountOwnerCard
        accountOwner={{
          name: org?.accountOwnerName ?? null,
          title: org?.accountOwnerTitle ?? null,
          email: org?.accountOwnerEmail ?? null,
          phone: org?.accountOwnerPhone ?? null,
        }}
        altContact={{
          name: org?.altContactName ?? null,
          email: org?.altContactEmail ?? null,
          phone: org?.altContactPhone ?? null,
        }}
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
