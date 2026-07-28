export type ExpiryStatus = "EXPIRED" | "EXPIRING_SOON" | "CURRENT" | "NONE"

export function getExpiryStatus(
  expiresAt: Date | string | null,
  reminderDaysBefore: number
): ExpiryStatus {
  if (!expiresAt) return "NONE"
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return "EXPIRED"
  if (daysLeft <= reminderDaysBefore) return "EXPIRING_SOON"
  return "CURRENT"
}

export const expiryStatusConfig: Record<ExpiryStatus, { label: string; color: string }> = {
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-800" },
  EXPIRING_SOON: { label: "Expiring Soon", color: "bg-amber-100 text-amber-800" },
  CURRENT: { label: "Current", color: "bg-green-100 text-green-800" },
  NONE: { label: "No Expiration", color: "bg-gray-100 text-gray-600" },
}
