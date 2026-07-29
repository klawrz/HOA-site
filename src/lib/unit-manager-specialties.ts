import { UnitManagerArea } from "@/generated/prisma"

export const SPECIALTY_LABELS: Record<UnitManagerArea, string> = {
  GUESTS: "Guest Services",
  CLEANING: "Cleaning",
  TICKETS: "Maintenance & Repairs",
  OCCUPANCY: "Occupancy Tracking",
}

export function parseSpecialties(value: string | null): UnitManagerArea[] {
  if (!value) return []
  return value.split(",").filter(Boolean) as UnitManagerArea[]
}
