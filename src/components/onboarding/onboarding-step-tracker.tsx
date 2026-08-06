"use client"

import { useEffect } from "react"
import { markOnboardingStepComplete } from "@/app/actions/onboarding"

// Invisible - drop one on a page that fulfills an onboarding step. Marks it
// done on first visit, no button or confirmation needed. A no-op if this
// Owner has already completed it (or isn't mid-onboarding at all - the
// action itself no-ops for non-Owners).
export function OnboardingStepTracker({ stepId, alreadyComplete }: { stepId: string; alreadyComplete: boolean }) {
  useEffect(() => {
    if (!alreadyComplete) {
      markOnboardingStepComplete(stepId)
    }
    // Only ever needs to fire once per mount - not a live-updating watcher.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
