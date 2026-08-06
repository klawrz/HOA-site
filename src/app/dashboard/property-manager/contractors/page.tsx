import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractorDirectory } from "@/components/contracts/contractor-directory"
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
            contracts: { orderBy: { createdAt: "desc" }, take: 2 },
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
      <div>
        <h1 className="text-2xl font-bold">Contractor Directory</h1>
        <p className="text-gray-500 mt-1">{contractors.length} contractors on file</p>
      </div>
      <ContractorDirectory contractors={contractors} />
    </div>
  )
}
