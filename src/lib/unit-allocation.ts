// A unit's effective allocation percent: its own manually-set value if the
// Board has customized it, otherwise an automatic equal share of whatever
// percentage isn't already claimed by customized units. Lets assessments
// work immediately for a brand-new org with no manual entry, while still
// letting the Board override specific units later via UnitAllocationTable.
export function effectiveAllocations(units: { id: string; allocationPercent: number | null }[]) {
  const customTotal = units.reduce((s, u) => s + (u.allocationPercent ?? 0), 0)
  const uncustomized = units.filter((u) => u.allocationPercent == null)
  const remaining = Math.max(0, 100 - customTotal)
  const equalShare = uncustomized.length > 0 ? remaining / uncustomized.length : 0
  return new Map(units.map((u) => [u.id, u.allocationPercent ?? equalShare]))
}
