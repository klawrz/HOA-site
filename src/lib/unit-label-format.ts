// Pure display helpers for the org's unit label ("Villa", "Apt", "Condo"...).
// Kept separate from unit-label.ts because that file imports the db client
// (via getUnitLabel), which breaks client components that only need these.
export function unitDisplayName(unitLabel: string, number: string, building?: string | null) {
  return building ? `${unitLabel} ${number} — Building ${building}` : `${unitLabel} ${number}`
}

// The property's own address never gets re-entered per unit - a unit's
// "address" is just its own name plus wherever the property already is.
export function unitAddressLines(
  org: {
    addressLine1: string | null
    addressLine2: string | null
    city: string | null
    state: string | null
    postalCode: string | null
    country: string | null
  },
  unitName: string
) {
  const line2 = [org.city, org.state, org.postalCode].filter(Boolean).join(", ")
  const propertyLines = [org.addressLine1, org.addressLine2, line2, org.country].filter(Boolean)
  return { unitName, propertyLines }
}
