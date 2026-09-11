import { DuesFrequency } from "@/generated/prisma"

export const DUES_FREQUENCY_LABEL: Record<DuesFrequency, string> = {
  QUARTERLY: "Quarterly",
  SEMI_ANNUAL: "Semi-annually",
  ANNUAL: "Annually",
}

// Payments per year for each cadence.
export const DUES_FREQUENCY_PER_YEAR: Record<DuesFrequency, number> = {
  QUARTERLY: 4,
  SEMI_ANNUAL: 2,
  ANNUAL: 1,
}

export const DUES_FREQUENCIES: DuesFrequency[] = ["QUARTERLY", "SEMI_ANNUAL", "ANNUAL"]

// A unit's annual dues = its allocation share of the operating-budget total.
export function annualDues(allocationPercent: number, budgetTotal: number): number {
  return budgetTotal * (allocationPercent / 100)
}

// The amount due each payment, given the cadence.
export function perPaymentDues(annual: number, frequency: DuesFrequency): number {
  return annual / DUES_FREQUENCY_PER_YEAR[frequency]
}

// The due date of each payment in the cadence, evenly spaced from Jan 1 of
// the given year - e.g. quarterly gives Jan 1 / Apr 1 / Jul 1 / Oct 1.
export function duesPaymentDates(frequency: DuesFrequency, year: number): Date[] {
  const perYear = DUES_FREQUENCY_PER_YEAR[frequency]
  const monthsApart = 12 / perYear
  return Array.from({ length: perYear }, (_, i) => new Date(Date.UTC(year, i * monthsApart, 1)))
}
