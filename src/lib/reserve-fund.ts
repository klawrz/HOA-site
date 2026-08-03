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
