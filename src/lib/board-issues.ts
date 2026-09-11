import { db } from "@/lib/db"
import type { BoardIssue, BoardIssueSeverity, BoardIssueStatus } from "@/generated/prisma"
import {
  boardIssueCategoryLabel,
  boardIssueStatusLabel,
  type BoardIssueAlert,
} from "@/lib/board-issues-shared"

// Manually-tracked Board / PM pending matters. Open ones surface on the
// Board home as "Pending matters", next to (not replacing) the derived
// financial alerts. Client-safe label maps live in board-issues-shared.
export {
  boardIssueCategoryLabel,
  boardIssueStatusLabel,
  boardIssueSeverityLabel,
  type BoardIssueAlert,
} from "@/lib/board-issues-shared"

const severityRank: Record<BoardIssueSeverity, number> = { CRITICAL: 0, ATTENTION: 1, INFO: 2 }
const statusRank: Record<BoardIssueStatus, number> = {
  BLOCKED: 0,
  IN_PROGRESS: 1,
  OPEN: 2,
  RESOLVED: 3,
}

export function sortBoardIssues<T extends Pick<BoardIssue, "status" | "severity" | "dueDate" | "createdAt">>(
  a: T,
  b: T
) {
  if (statusRank[a.status] !== statusRank[b.status]) return statusRank[a.status] - statusRank[b.status]
  if (severityRank[a.severity] !== severityRank[b.severity])
    return severityRank[a.severity] - severityRank[b.severity]
  const ad = a.dueDate?.getTime() ?? Infinity
  const bd = b.dueDate?.getTime() ?? Infinity
  if (ad !== bd) return ad - bd
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export async function listBoardIssues(orgId: string): Promise<BoardIssue[]> {
  const issues = await db.boardIssue.findMany({ where: { orgId } })
  return issues.sort(sortBoardIssues)
}

const levelForSeverity: Record<BoardIssueSeverity, BoardIssueAlert["level"]> = {
  CRITICAL: "critical",
  ATTENTION: "warning",
  INFO: "info",
}

// Open / in-progress / blocked issues as home-page alerts. Resolved ones
// drop off. Shape matches BoardFinancialAlert so the home page renders
// both with the same component.
export async function getBoardIssueAlerts(
  orgId: string,
  portalBase = "/dashboard/board"
): Promise<BoardIssueAlert[]> {
  const issues = await db.boardIssue.findMany({
    where: { orgId, status: { not: "RESOLVED" } },
  })
  return issues.sort(sortBoardIssues).map((i) => {
    const bits: string[] = [boardIssueCategoryLabel[i.category]]
    if (i.status !== "OPEN") bits.push(boardIssueStatusLabel[i.status].toLowerCase())
    if (i.owner) bits.push(`with ${i.owner}`)
    if (i.costPending) bits.push("cost not yet determined")
    else if (i.costEstimate != null) bits.push(`est. ${Math.round(i.costEstimate).toLocaleString()}`)
    if (i.dueDate) bits.push(`due ${i.dueDate.toLocaleDateString("en-CA", { timeZone: "UTC" })}`)
    const detail = i.detail ? `${i.detail} — ${bits.join(" · ")}` : bits.join(" · ")
    return {
      id: i.id,
      level: levelForSeverity[i.severity],
      title: i.title,
      detail,
      href: `${portalBase}/issues`,
    }
  })
}
