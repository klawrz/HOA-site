"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { parseCompletedSteps, serializeCompletedSteps } from "@/lib/onboarding-steps"

// stepId is usually one of ONBOARDING_STEP_IDS, but also accepts the
// synthetic "welcome_seen" marker (set once the completion message has
// been acknowledged, so it doesn't reappear on every visit) - both are
// just entries in the same free-text completed-steps list.
const ONBOARDING_ROLES = ["OWNER", "BOARD_MEMBER", "PROPERTY_MANAGER", "CONTRACTOR"]

export async function markOnboardingStepComplete(stepId: string) {
  const session = await auth()
  if (!session?.user.orgId || !ONBOARDING_ROLES.includes(session.user.role ?? "")) {
    return { success: false }
  }

  const membership = await db.membership.findUnique({
    where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId } },
  })
  if (!membership) return { success: false }

  const completed = parseCompletedSteps(membership.onboardingSteps)
  if (completed.has(stepId)) return { success: true }

  completed.add(stepId)
  await db.membership.update({
    where: { id: membership.id },
    data: { onboardingSteps: serializeCompletedSteps(completed) },
  })

  revalidatePath("/dashboard/owner")
  revalidatePath("/dashboard/board")
  revalidatePath("/dashboard/property-manager")
  revalidatePath("/dashboard/contractor")
  return { success: true }
}
