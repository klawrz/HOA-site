// Per-role Welcome Journeys - short, real-page checklists rather than
// separate wizard flows. Each step links to a page that already exists;
// visiting it marks the step done (see OnboardingStepTracker), so there's
// nothing extra to build or maintain per step beyond these lists.
export interface OnboardingStep {
  id: string
  title: string
  description: string
  href: string
}

// "unit" needs the owner's own unit id, only known at render time (an
// Owner can have more than one unit, and there's no generic
// /dashboard/owner/units index page - just the per-unit page).
export function getOwnerOnboardingSteps(firstUnitId: string | null): OnboardingStep[] {
  return [
    {
      id: "unit",
      title: "See your unit",
      description: "Confirm your unit's details are correct.",
      href: firstUnitId ? `/dashboard/owner/units/${firstUnitId}` : "/dashboard/owner",
    },
    {
      id: "dues",
      title: "Check your dues",
      description: "See what's owed and how to pay.",
      href: "/dashboard/owner/financial/dues",
    },
    {
      id: "governance",
      title: "Meet your Board & find key contacts",
      description: "Announcements, documents, and who to contact.",
      href: "/dashboard/owner/governance",
    },
    {
      id: "tickets",
      title: "Know how to submit a maintenance request",
      description: "See where trouble tickets go when something needs fixing.",
      href: "/dashboard/owner/tickets",
    },
  ]
}

export const OWNER_STEP_IDS = ["unit", "dues", "governance", "tickets"]

export const BOARD_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "board_key_info",
    title: "Review Key Information",
    description: "Bank details, signing authority, your fellow Board members, and the Property Manager.",
    href: "/dashboard/board/key-info",
  },
  {
    id: "board_finances",
    title: "Check the Finances",
    description: "See the current budget - what's approved and where dues are drawn from.",
    href: "/dashboard/board/finances",
  },
  {
    id: "board_reserve",
    title: "Check the Reserve Fund",
    description: "Current balance, target, and the year-over-year history.",
    href: "/dashboard/board/finances/reserve",
  },
  {
    id: "board_meetings",
    title: "See upcoming Meetings",
    description: "Where agendas, motions, and minutes live.",
    href: "/dashboard/board/meetings",
  },
]

export const BOARD_STEP_IDS = BOARD_ONBOARDING_STEPS.map((s) => s.id)

export const PM_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "pm_key_info",
    title: "Review Key Information",
    description: "Bank details, signing authority, and your Board contacts.",
    href: "/dashboard/property-manager/key-info",
  },
  {
    id: "pm_finances",
    title: "Check the Finances",
    description: "See the current budget - what's approved and where dues are drawn from.",
    href: "/dashboard/property-manager/finances",
  },
  {
    id: "pm_tickets",
    title: "See open Trouble Tickets",
    description: "Where maintenance requests come in and get assigned to a contractor.",
    href: "/dashboard/property-manager/tickets",
  },
  {
    id: "pm_contractors",
    title: "Meet your Contractors",
    description: "The vendor directory you'll assign work orders to.",
    href: "/dashboard/property-manager/contractors",
  },
]

export const PM_STEP_IDS = PM_ONBOARDING_STEPS.map((s) => s.id)

// Contractors have a much smaller surface than the other roles (one
// dashboard, one contracts page), so this journey is deliberately just 2
// steps. "contractor_profile" isn't visit-marked like the rest - it's
// marked complete by updateContractorProfile() itself once the contractor
// actually saves a company or category, since simply loading the dashboard
// (where the form lives) wouldn't mean anything was filled in.
export const CONTRACTOR_ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "contractor_profile",
    title: "Complete your Business Profile",
    description: "Your company, phone, and service category - how the Board and PM find you.",
    href: "/dashboard/contractor",
  },
  {
    id: "contractor_contracts",
    title: "Review your Contracts",
    description: "Any signed agreements you have with the HOA.",
    href: "/dashboard/contractor/contracts",
  },
]

export const CONTRACTOR_STEP_IDS = CONTRACTOR_ONBOARDING_STEPS.map((s) => s.id)

export function parseCompletedSteps(raw: string | null): Set<string> {
  return new Set((raw ?? "").split(",").map((s) => s.trim()).filter(Boolean))
}

export function serializeCompletedSteps(steps: Set<string>): string {
  return Array.from(steps).join(",")
}

export function isOnboardingComplete(raw: string | null, stepIds: string[]): boolean {
  const completed = parseCompletedSteps(raw)
  return stepIds.every((id) => completed.has(id))
}
