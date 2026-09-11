import type {
  BoardIssueCategory,
  BoardIssueSeverity,
  BoardIssueStatus,
} from "@/generated/prisma"

// Client-safe label maps + the alert shape - no "@/lib/db" import, so this
// can be pulled into client components. Data functions live in
// "@/lib/board-issues".

export const boardIssueCategoryLabel: Record<BoardIssueCategory, string> = {
  LEGAL_TAX: "Legal / Tax",
  COMPLIANCE: "Compliance",
  FINANCIAL: "Financial",
  PROPERTY: "Property",
  GOVERNANCE: "Governance",
  MEETING: "Meeting",
}

export const boardIssueStatusLabel: Record<BoardIssueStatus, string> = {
  OPEN: "Open",
  IN_PROGRESS: "In progress",
  BLOCKED: "Blocked",
  RESOLVED: "Resolved",
}

export const boardIssueSeverityLabel: Record<BoardIssueSeverity, string> = {
  INFO: "Review",
  ATTENTION: "Attention",
  CRITICAL: "Critical",
}

export type BoardIssueAlert = {
  id: string
  level: "critical" | "warning" | "info"
  title: string
  detail: string
  href: string
}
