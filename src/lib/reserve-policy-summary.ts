// Frozen figures from the Reserve Fund Policy, Revision 2 (circulation draft,
// frozen 2026-09-09). See "SampaguitaNEW docs/reserve-fund-policy.md". These are
// planning placeholders confirmed or amended by owner motion at the AGM - they
// are deliberately a static snapshot of the policy, not live-computed values.
export const RESERVE_POLICY_SUMMARY = {
  revision: 2,
  frozenOn: "2026-09-09",
  status: "Circulation draft — pending owner adoption",

  currency: "USD" as const,
  exchangeRate: 17.5, // MXN per USD, matches the FY2027 operating budget

  balance: 60_000, // start of 2026
  target: 100_000, // placeholder — AGM motion required
  coveragePct: 60,
  floorPct: 30,
  floor: 30_000, // 30% of target — special-assessment trigger

  shortfallToClose: 40_000, // target − balance
  topUpYears: 5, // planning default, amendable by AGM motion

  roofYear: 2027,
  roofDrawdown: 150_000, // funded by 2027 & 2028 special assessments, not the top-up

  // The number that has to land in the coming year's operating budget.
  budgetYear: 2027,
  budgetLineUsd: 8_000, // shortfallToClose ÷ topUpYears
  budgetLineMxn: 140_000, // budgetLineUsd × exchangeRate
} as const

export type ReservePolicySummary = typeof RESERVE_POLICY_SUMMARY
