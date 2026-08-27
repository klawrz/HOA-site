import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { OnboardingWizard } from "./wizard"
import { compareUnitNumbers } from "@/lib/unit-label"

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
      units: true,
      invites: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!org) redirect("/login")
  if (org.onboardingComplete) redirect("/dashboard")
  org.units.sort(compareUnitNumbers)

  const { step } = await searchParams
  const currentStep = Number(step) || 1

  const ownedUnitRow = await db.unitOwnership.findFirst({
    where: { ownerId: session.user.id, isCurrent: true, unit: { orgId: session.user.orgId } },
    include: { unit: { select: { id: true, number: true } } },
  })

  const boardPositions = await db.boardPosition.findMany({
    where: { orgId: session.user.orgId },
    select: { id: true, title: true, userId: true },
    orderBy: { title: "asc" },
  })

  const pendingOwnerRows = await db.pendingOwner.findMany({
    where: { orgId: session.user.orgId },
    include: { unit: { select: { number: true } } },
    orderBy: { createdAt: "asc" },
  })
  const pendingOwners = pendingOwnerRows.map((p) => ({
    id: p.id,
    unitId: p.unitId,
    unitNumber: p.unit.number,
    name: p.name,
    email: p.email,
  }))

  return (
    <OnboardingWizard
      org={{ id: org.id, name: org.name }}
      units={org.units}
      invites={org.invites}
      step={currentStep}
      baseUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
      unitLabel={org.unitLabel}
      ownedUnit={ownedUnitRow ? { id: ownedUnitRow.unit.id, number: ownedUnitRow.unit.number } : null}
      boardPositions={boardPositions}
      pendingOwners={pendingOwners}
    />
  )
}
