export const contractTypeLabel: Record<string, string> = {
  RECURRING: "Recurring",
  PROJECT: "Project",
  CRITICAL: "Critical",
}

export const contractTypeColor: Record<string, string> = {
  RECURRING: "bg-blue-100 text-blue-800",
  PROJECT: "bg-gray-100 text-gray-600",
  CRITICAL: "bg-red-100 text-red-800",
}

export const contractScopeLabel: Record<string, string> = {
  PROPERTY: "Property",
  UNIT: "Unit",
}

export const contractStatusColor: Record<string, string> = {
  ACTIVE: "bg-green-100 text-green-800",
  EXPIRED: "bg-gray-100 text-gray-600",
  TERMINATED: "bg-red-100 text-red-800",
}

export const billingPeriodLabel: Record<string, string> = {
  WEEKLY: "week",
  MONTHLY: "month",
  YEARLY: "year",
}

export { getExpiryStatus, expiryStatusConfig } from "@/lib/expiry-status"
