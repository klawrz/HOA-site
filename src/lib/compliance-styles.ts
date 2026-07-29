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

export {
  getExpiryStatus as getComplianceStatus,
  expiryStatusConfig as complianceStatusConfig,
  type ExpiryStatus as ComplianceStatus,
} from "@/lib/expiry-status"
