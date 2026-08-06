import { db } from "@/lib/db"

// The org's own word for a unit ("Villa", "Apt", "Condo"...) - defaults to
// the generic "Unit" so orgs that never set one see no change. Used
// everywhere a SPECIFIC unit is named (e.g. "Villa 3"); structural terms
// like the "Units" nav item or the Unit Manager role are unaffected.
export async function getUnitLabel(orgId: string | null | undefined) {
  if (!orgId) return "Unit"
  const org = await db.organization.findUnique({ where: { id: orgId }, select: { unitLabel: true } })
  return org?.unitLabel ?? "Unit"
}

export { unitDisplayName, unitAddressLines, compareUnitNumbers } from "./unit-label-format"
