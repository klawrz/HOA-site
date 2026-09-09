// Reserve Fund Policy summary shown on the reserve page. The editable inputs
// live on Organization (reservePolicy* columns); anything not set falls back to
// these frozen defaults from Revision 2 of the policy (frozen 2026-09-09, see
// "SampaguitaNEW docs/reserve-fund-policy.md"). Coverage, the floor, the
// shortfall and the budget top-up are always derived here, never stored, so the
// figures stay internally consistent whoever edits them.
export const RESERVE_POLICY_DEFAULTS = {
  revision: "2",
  status: "Circulation draft — pending owner adoption",
  asOf: "start of 2026",

  balance: 60_000,
  target: 100_000, // placeholder — AGM motion required
  topUpYears: 5, // planning default, amendable by AGM motion
  floorPct: 30, // minimum reserve floor as % of target
  exchangeRate: 17.5, // MXN per 1 USD

  roofYear: 2027,
  roofDrawdown: 150_000, // funded by special assessments, not the top-up

  budgetYear: 2027, // the coming year the top-up lands in
  budgetLineUsdOverride: null as number | null,
}

// The subset of Organization the resolver reads. All optional.
export interface ReservePolicyOrgFields {
  reserveTarget?: number | null
  reservePolicyRevision?: string | null
  reservePolicyStatus?: string | null
  reservePolicyAsOf?: string | null
  reservePolicyBalance?: number | null
  reservePolicyTopUpYears?: number | null
  reservePolicyFloorPct?: number | null
  reservePolicyExchangeRate?: number | null
  reservePolicyRoofYear?: number | null
  reservePolicyRoofDrawdown?: number | null
  reservePolicyBudgetYear?: number | null
  reservePolicyBudgetLineUsd?: number | null
}

export interface ResolvedReservePolicy {
  revision: string
  status: string
  asOf: string
  // stored inputs
  balance: number
  target: number
  topUpYears: number
  floorPct: number
  exchangeRate: number
  roofYear: number
  roofDrawdown: number
  budgetYear: number
  budgetLineUsdOverride: number | null
  // derived
  coveragePct: number
  floor: number
  shortfallToClose: number
  budgetLineUsd: number
  budgetLineMxn: number
  budgetLineIsOverride: boolean
}

const num = (v: number | null | undefined, fallback: number) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback
const str = (v: string | null | undefined, fallback: string) =>
  typeof v === "string" && v.trim() ? v.trim() : fallback

export function resolveReservePolicy(org: ReservePolicyOrgFields | null | undefined): ResolvedReservePolicy {
  const d = RESERVE_POLICY_DEFAULTS
  const balance = Math.max(0, num(org?.reservePolicyBalance, d.balance))
  const target = Math.max(0, num(org?.reserveTarget, d.target))
  const topUpYears = Math.max(1, Math.round(num(org?.reservePolicyTopUpYears, d.topUpYears)))
  const floorPct = Math.min(100, Math.max(0, Math.round(num(org?.reservePolicyFloorPct, d.floorPct))))
  const exchangeRate = num(org?.reservePolicyExchangeRate, d.exchangeRate)
  const budgetLineUsdOverride =
    typeof org?.reservePolicyBudgetLineUsd === "number" && Number.isFinite(org.reservePolicyBudgetLineUsd)
      ? Math.max(0, org.reservePolicyBudgetLineUsd)
      : null

  const coveragePct = target > 0 ? Math.round((balance / target) * 100) : 0
  const floor = Math.round((target * floorPct) / 100)
  const shortfallToClose = Math.max(0, Math.round(target - balance))
  const derivedTopUp = Math.round(shortfallToClose / topUpYears)
  const budgetLineUsd = budgetLineUsdOverride ?? derivedTopUp

  return {
    revision: str(org?.reservePolicyRevision, d.revision),
    status: str(org?.reservePolicyStatus, d.status),
    asOf: str(org?.reservePolicyAsOf, d.asOf),
    balance,
    target,
    topUpYears,
    floorPct,
    exchangeRate,
    roofYear: Math.round(num(org?.reservePolicyRoofYear, d.roofYear)),
    roofDrawdown: Math.max(0, num(org?.reservePolicyRoofDrawdown, d.roofDrawdown)),
    budgetYear: Math.round(num(org?.reservePolicyBudgetYear, d.budgetYear)),
    budgetLineUsdOverride,
    coveragePct,
    floor,
    shortfallToClose,
    budgetLineUsd,
    budgetLineMxn: Math.round(budgetLineUsd * exchangeRate),
    budgetLineIsOverride: budgetLineUsdOverride != null,
  }
}
