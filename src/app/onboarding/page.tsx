import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { OnboardingWizard } from "./wizard"

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ step?: string }>
}) {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    include: {
      units: { orderBy: { number: "asc" } },
      invites: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!org) redirect("/login")
  if (org.onboardingComplete) redirect("/dashboard")

  const { step } = await searchParams
  const currentStep = Number(step) || 1

  return (
    <OnboardingWizard
      org={{ id: org.id, name: org.name }}
      units={org.units}
      invites={org.invites}
      step={currentStep}
      baseUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
    />
  )
}
