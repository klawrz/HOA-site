import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign, FileText, Receipt, ChevronRight } from "lucide-react"
import { BudgetEditor } from "@/components/budgets/budget-editor"
import { BoardRosterCard } from "@/components/key-info/board-roster-card"
import { PMKeyContactCard } from "@/components/key-info/pm-key-contact-card"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"
import { getPMSetupStatus } from "@/lib/setup-status"
import { canPreviewRole } from "@/lib/role-access"

// Tightened 2026-08-28 per Dara: "Only the financial governance block
// below that - budget, dues, link to documents." Everything else that
// used to live here (Key Dates, Announcements, Property Address, Bank
// Info, Insurance, generic Key Contacts, the two policy-text cards,
// Upcoming Meetings, Reserve Fund) is gone from this page - Key Dates and
// Announcements already have their own home on the Owner home page, the
// rest stays reachable from Board's/PM's/Account Owner's own fuller Key
// Information pages. An owner clicking "Board" now sees exactly: who's on
// it, the PM (highlighted), and financial governance (budget/dues/docs).
export default async function OwnerGovernancePage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "OWNER")) redirect("/dashboard")

  const isBoardMember = session.user.isBoardMember

  const [boardPositions, documents, latestApprovedBudget, org, activePMContract, ownMembership, pmStatus] = await Promise.all([
    db.boardPosition.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { user: true },
      orderBy: { title: "asc" },
    }),
    db.document.findMany({
      where: { orgId: session.user.orgId ?? undefined, ...(isBoardMember ? {} : { visibility: "OWNERS" }) },
      orderBy: { createdAt: "desc" },
    }),
    db.budget.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: { include: { contract: true }, orderBy: { sortOrder: "asc" } }, meeting: true },
      orderBy: { year: "desc" },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    db.pMContract.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "ACTIVE" },
      include: { company: { include: { emergencyContacts: { orderBy: { createdAt: "asc" } } } } },
      orderBy: { startDate: "desc" },
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
    getPMSetupStatus(session.user.orgId ?? ""),
  ])
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("governance")

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="governance" alreadyComplete={onboardingStepDone} />
      <div>
        <h1 className="text-2xl font-bold">Governance</h1>
        <p className="text-gray-500 mt-1">Your Board, the Property Manager, and financial governance</p>
      </div>

      <BoardRosterCard positions={boardPositions} />

      <PMKeyContactCard
        company={activePMContract?.company ?? null}
        status={pmStatus}
        highlighted
        ticketsHref="/dashboard/owner/tickets"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Financial Governance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            {isBoardMember && (
              <Link
                href="/dashboard/owner/governance/board/finances"
                className="flex items-center justify-between text-sm text-blue-600 hover:underline pb-3"
              >
                Manage all budgets
                <ChevronRight className="h-4 w-4" />
              </Link>
            )}
            {latestApprovedBudget ? (
              <BudgetEditor
                budget={{
                  id: latestApprovedBudget.id,
                  year: latestApprovedBudget.year,
          periodLabel: latestApprovedBudget.periodLabel,
          revision: latestApprovedBudget.revision,
          currency: latestApprovedBudget.currency,
          exchangeRate: latestApprovedBudget.exchangeRate,
                  version: latestApprovedBudget.version,
                  status: latestApprovedBudget.status,
                  notes: latestApprovedBudget.notes,
                  approvedAt: latestApprovedBudget.approvedAt,
                  approvalExchangeRate: latestApprovedBudget.approvalExchangeRate,
                  meetingTitle: latestApprovedBudget.meeting?.title ?? null,
                  lineItems: latestApprovedBudget.lineItems.map((i) => ({
                    id: i.id,
                    label: i.label,
                    budgetedAmount: i.budgetedAmount,
                    actualAmount: i.actualAmount,
                    previousYearActual: i.previousYearActual,
                    contractId: i.contractId,
                    contractTitle: i.contract?.title ?? null,
                  })),
                }}
                contracts={[]}
                meetings={[]}
                canManage={false}
                canApprove={false}
                baseCurrency={org?.baseCurrency}
                currentExchangeRate={org?.currentExchangeRate ?? null}
                exchangeRateUpdatedAt={org?.exchangeRateUpdatedAt ?? null}
              />
            ) : (
              <p className="text-sm text-gray-500">No approved budget yet.</p>
            )}
          </div>

          <Link
            href="/dashboard/owner/financial/dues"
            className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <Receipt className="h-4 w-4 text-gray-500" /> Dues & Assessments
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>

          <Link
            href="/dashboard/owner/governance/documents"
            className="flex items-center justify-between bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 transition-colors"
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              <FileText className="h-4 w-4 text-gray-500" /> Document Repository
              <span className="text-gray-400 font-normal">
                · {documents.length} document{documents.length !== 1 ? "s" : ""}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-gray-300" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
