export const priorityColor: Record<string, string> = {
  EMERGENCY: "bg-red-600 text-white",
  URGENT: "bg-red-100 text-red-800",
  HIGH: "bg-orange-100 text-orange-800",
  MEDIUM: "bg-blue-100 text-blue-800",
  LOW: "bg-gray-100 text-gray-600",
}

export const statusColor: Record<string, string> = {
  OPEN: "bg-yellow-100 text-yellow-800",
  IN_PROGRESS: "bg-blue-100 text-blue-800",
  RESOLVED: "bg-green-100 text-green-800",
  CLOSED: "bg-gray-100 text-gray-600",
}

export const scopeLabel: Record<string, string> = {
  UNIT: "Unit",
  COMMON_AREA: "Common Property",
}
