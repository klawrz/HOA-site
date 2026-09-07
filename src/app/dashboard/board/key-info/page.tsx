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
import { KeyDatesCard } from "@/components/key-info/key-dates-card"
import { getUpcomingKeyDates } from "@/lib/key-dates"
import { PMKeyContactCard } from "@/components/key-info/pm-key-contact-card"
import { AccountOwnerCard } from "@/components/key-info/account-owner-card"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"
import { getPMSetupStatus } from "@/lib/setup-status"
import { canPreviewRole } from "@/lib/role-access"

export default async function BoardKeyInfoPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const [org, contacts, boardPositions, activePMContract, insuranceContract, ownMembership, pmStatus] = await Promise.all([
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
    // The active property-wide insurance contract - primarily identified by
    // its contractor being categorised INSURANCE (Contract itself has no
    // category), with a title fallback since the inline "add contractor"
    // flow leaves category optional. Surfaced right in the bank block so
    // "is coverage in place" is answered alongside the account details.
    db.contract.findFirst({
      where: {
        orgId: session.user.orgId ?? undefined,
        scope: "PROPERTY",
        status: "ACTIVE",
        OR: [{ contractor: { category: "INSURANCE" } }, { title: { contains: "insurance" } }],
      },
      include: { contractor: true },
      orderBy: { startDate: "desc" },
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
    getPMSetupStatus(session.user.orgId ?? ""),
  ])
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("board_key_info")
  const keyDates = await getUpcomingKeyDates(
    session.user.orgId ?? "",
    { agm: "/dashboard/board/key-info/agm", dues: "/dashboard/board/finances/assessments" },
    ["BOARD_MEMBER"]
  )

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="board_key_info" alreadyComplete={onboardingStepDone} />
      <div>
        <h1 className="text-2xl font-bold">Key Information</h1>
        <p className="text-gray-500 mt-1">Bank details and the institutional contacts owners rely on</p>
      </div>

      <BoardRosterCard positions={boardPositions} />

      <KeyDatesCard dates={keyDates} canManage />

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
        insuranceHref="/dashboard/board/contracts"
        insurance={
          insuranceContract
            ? {
                insurerName:
                  insuranceContract.contractor.company ??
                  insuranceContract.contractor.name ??
                  insuranceContract.contractor.email ??
                  "Unknown insurer",
                startDate: insuranceContract.startDate,
                endDate: insuranceContract.endDate,
                amount: insuranceContract.amount,
                billingPeriod: insuranceContract.billingPeriod,
                reminderDaysBefore: insuranceContract.reminderDaysBefore,
              }
            : null
        }
      />

      <PMKeyContactCard company={activePMContract?.company ?? null} status={pmStatus} />

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
