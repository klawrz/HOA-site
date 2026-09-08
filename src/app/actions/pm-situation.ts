"use server"

import { auth } from "@/auth"
import { canPreviewRole } from "@/lib/role-access"
import { propertySkill } from "@/lib/skills/property"
import type { SituationRead, SituationSeverity } from "@/lib/skills"

// Thin server action for the PM situation panel. The read itself is the
// Property skill's proactive capability (src/lib/skills/property-situation.ts);
// this just authorizes the caller and delegates.

export type PMSituationSeverity = SituationSeverity
export type PMSituationResult = SituationRead | { ok: false; error: string }

export async function getPMSituation(): Promise<PMSituationResult> {
  const session = await auth()
  if (!session?.user.orgId || !canPreviewRole(session.user.role, "BOARD_MEMBER")) {
    return { ok: false, error: "Not authorized." }
  }
  if (!propertySkill.getSituation) return { ok: false, error: "The property situation read isn't available." }
  return propertySkill.getSituation(session)
}
