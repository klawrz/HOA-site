import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { ContractList } from "@/components/contracts/contract-list"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"

export default async function ContractorContractsPage() {
  const session = await auth()
  if (!session || session.user.role !== "CONTRACTOR") redirect("/dashboard")

  const [contracts, ownMembership] = await Promise.all([
    db.contract.findMany({
      where: { contractorId: session.user.id },
      include: { contractor: true },
      orderBy: { createdAt: "desc" },
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
  ])
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("contractor_contracts")

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="contractor_contracts" alreadyComplete={onboardingStepDone} />
      <div>
        <h1 className="text-2xl font-bold">My Contracts</h1>
        <p className="text-gray-500 mt-1">Contracts you&apos;ve been engaged for.</p>
      </div>
      <ContractList contracts={contracts} canManage={false} />
    </div>
  )
}
