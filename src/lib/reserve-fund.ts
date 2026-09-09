// Who can edit reserve-fund data (transactions, details, policy figures).
// The server actions re-check this against the REAL role/isBoardMember - this
// export is shared so pages can decide whether to render the edit controls.
export function canManageReserveFund(role: string | null | undefined, isBoardMember: boolean): boolean {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

export function reserveYearRange(): number[] {
  const current = new Date().getFullYear()
  const years: number[] = []
  for (let y = current - 3; y <= current + 3; y++) years.push(y)
  return years
}

// Opening/additions/drawdowns/closing are all derived live from
// ReserveTransaction, same as the running balance always has been - no
// second, conflicting source of truth. A future year with no transactions
// yet just carries the current balance forward with $0 activity until real
// transactions are recorded against it.
export function computeReserveYearRows(
  transactions: { type: "DEPOSIT" | "WITHDRAWAL"; amount: number; date: Date }[],
  years: number[]
) {
  return years.map((year) => {
    const opening = transactions
      .filter((t) => t.date.getFullYear() < year)
      .reduce((s, t) => s + (t.type === "DEPOSIT" ? t.amount : -t.amount), 0)
    const inYear = transactions.filter((t) => t.date.getFullYear() === year)
    const additions = inYear.filter((t) => t.type === "DEPOSIT").reduce((s, t) => s + t.amount, 0)
    const drawdowns = inYear.filter((t) => t.type === "WITHDRAWAL").reduce((s, t) => s + t.amount, 0)
    return { year, opening, additions, drawdowns, closing: opening + additions - drawdowns }
  })
}

// Estimated expenditure date is always lastDone + lifeExpectancyYears -
// never stored, so editing lastDone or lifeExpectancyYears can't leave a
// stale date sitting around. Preserves month/day (e.g. a roof last done
// June 2020 with a 20-year life is due June 2040, not just "2040").
export function estimatedExpenditureDate(lastDone: Date, lifeExpectancyYears: number): Date {
  const d = new Date(lastDone)
  d.setFullYear(d.getFullYear() + lifeExpectancyYears)
  return d
}

// "Within 5 years" per the audit/planning framing this section exists for
// - items further out still show, just not flagged as near-term.
export function isWithinYears(estimatedDate: Date, years: number): boolean {
  const cutoff = new Date()
  cutoff.setFullYear(cutoff.getFullYear() + years)
  return estimatedDate <= cutoff
}
