export const complianceCategoryLabel: Record<string, string> = {
  BYLAWS_CONSTITUTION: "Bylaws / Constitution",
  RULES_REGULATIONS: "Rules & Regulations",
  GOVERNING_LAW: "Governing Law (Condo Act)",
  HOMEOWNER_MEETINGS: "Homeowner Meetings",
  ENTITY_REGISTRATION: "Entity Registration",
  TAX_FILING: "Tax Filing",
  INSURANCE: "Insurance",
  PERMIT_LICENSE: "Permit / License",
  OTHER: "Other",
}

export const meetingDocTypeLabel: Record<string, string> = {
  CALL: "Call to Meeting",
  PROXIES: "Proxies",
  AGENDA: "Agenda",
  MINUTES: "Minutes",
}

export type MinutesFilingStatus = "NOT_REQUIRED" | "FILED" | "PENDING"

export function getMinutesFilingStatus(
  minutesFilingRequired: boolean | null,
  minutesFiled: boolean | null
): MinutesFilingStatus {
  if (!minutesFilingRequired) return "NOT_REQUIRED"
  return minutesFiled ? "FILED" : "PENDING"
}

export const minutesFilingStatusConfig: Record<MinutesFilingStatus, { label: string; color: string }> = {
  NOT_REQUIRED: { label: "No Filing Required", color: "bg-gray-100 text-gray-600" },
  FILED: { label: "Filed", color: "bg-green-100 text-green-800" },
  PENDING: { label: "Filing Required — Not Yet Filed", color: "bg-red-100 text-red-800" },
}

export type ComplianceStatus = "EXPIRED" | "EXPIRING_SOON" | "CURRENT" | "NONE"

export function getComplianceStatus(
  expiresAt: Date | string | null,
  reminderDaysBefore: number
): ComplianceStatus {
  if (!expiresAt) return "NONE"
  const daysLeft = (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  if (daysLeft < 0) return "EXPIRED"
  if (daysLeft <= reminderDaysBefore) return "EXPIRING_SOON"
  return "CURRENT"
}

export const complianceStatusConfig: Record<ComplianceStatus, { label: string; color: string }> = {
  EXPIRED: { label: "Expired", color: "bg-red-100 text-red-800" },
  EXPIRING_SOON: { label: "Expiring Soon", color: "bg-amber-100 text-amber-800" },
  CURRENT: { label: "Current", color: "bg-green-100 text-green-800" },
  NONE: { label: "No Expiration", color: "bg-gray-100 text-gray-600" },
}
