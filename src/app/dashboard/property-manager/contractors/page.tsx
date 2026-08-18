import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractorDirectory } from "@/components/contracts/contractor-directory"
import { AddContractorDialog } from "@/components/contracts/add-contractor-dialog"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"

export default async function ContractorsDirectoryPage() {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") redirect("/dashboard")

  const [memberships, ownMembership] = await Promise.all([
    db.membership.findMany({
      where: { orgId: session.user.orgId ?? undefined, role: "CONTRACTOR" },
      include: {
        user: {
          include: {
            assignedTickets: {
              include: { ticket: { select: { status: true, title: true, id: true } } },
            },
            // Not just the 2 most recent - an ACTIVE contract needs to be
            // findable even if it isn't among the newest rows (e.g. a newer
            // ENDED renewal draft sorts above it by createdAt).
            contracts: { orderBy: { createdAt: "desc" } },
          },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
  ])
  const contractors = memberships.map((m) => m.user)
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("pm_contractors")

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="pm_contractors" alreadyComplete={onboardingStepDone} />
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contractor Directory</h1>
          <p className="text-gray-500 mt-1">{contractors.length} contractors on file</p>
        </div>
        <AddContractorDialog />
      </div>
      <ContractorDirectory contractors={contractors} orgId={session.user.orgId ?? ""} />
    </div>
  )
}
