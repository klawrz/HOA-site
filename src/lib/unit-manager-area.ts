import { UnitManagerArea } from "@/generated/prisma"

// Short labels for a Unit Manager's delegated areas, as shown to owners.
// (SPECIALTY_LABELS in unit-manager-specialties.ts is the longer,
// directory-style phrasing used when picking a manager.)
export const AREA_LABELS: Record<UnitManagerArea, string> = {
  GUESTS: "Guests",
  CLEANING: "Cleaning",
  TICKETS: "Tickets",
  OCCUPANCY: "Occupancy",
}

export const UNIT_MANAGER_AREAS: UnitManagerArea[] = ["GUESTS", "CLEANING", "TICKETS", "OCCUPANCY"]
