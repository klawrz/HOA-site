import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { getOwnerFinancialOverview } from "@/lib/owner-financial-overview"
import { OwnerFinancialDetail } from "@/components/owner/owner-financial-detail"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"

export default async function OwnerDuesPage() {
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")

  const [data, ownMembership] = await Promise.all([
    getOwnerFinancialOverview(session),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
  ])
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("dues")

  return (
    <div className="space-y-6">
      <OnboardingStepTracker stepId="dues" alreadyComplete={onboardingStepDone} />
      <div>
        <Link
          href="/dashboard/owner/financial"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Financial
        </Link>
        <h1 className="text-2xl font-bold">Dues &amp; Assessments</h1>
        <p className="text-gray-500 mt-1">
          What your unit owes and when &mdash; anticipated dues by quarter, assessments, and per-villa
          charges. All amounts in US dollars.
        </p>
      </div>

      <OwnerFinancialDetail data={data} />
    </div>
  )
}
