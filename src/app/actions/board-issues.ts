"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type {
  BoardIssueCategory,
  BoardIssueSeverity,
  BoardIssueStatus,
} from "@/generated/prisma"

type Result = { success: boolean; error?: string }

function canManage(role: string | null, isBoardMember: boolean) {
  return (
    role === "BOARD_MEMBER" ||
    isBoardMember ||
    role === "ACCOUNT_OWNER" ||
    role === "PROPERTY_MANAGER"
  )
}

function revalidate() {
  for (const p of [
    "/dashboard/board",
    "/dashboard/board/issues",
    "/dashboard/property-manager",
    "/dashboard/property-manager/issues",
  ]) {
    revalidatePath(p)
  }
}

const CATEGORIES = ["LEGAL_TAX", "COMPLIANCE", "FINANCIAL", "PROPERTY", "GOVERNANCE", "MEETING"]
const SEVERITIES = ["INFO", "ATTENTION", "CRITICAL"]
const STATUSES = ["OPEN", "IN_PROGRESS", "BLOCKED", "RESOLVED"]

function dateOnly(v: string | null): Date | null {
  if (!v) return null
  const d = new Date(`${v}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

export async function upsertBoardIssue(formData: FormData): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManage(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const orgId = session.user.orgId

  const id = (formData.get("id") as string) || null
  const title = ((formData.get("title") as string) || "").trim()
  if (!title) return { success: false, error: "A title is required" }

  const catRaw = (formData.get("category") as string) || "GOVERNANCE"
  const sevRaw = (formData.get("severity") as string) || "ATTENTION"
  const statRaw = (formData.get("status") as string) || "OPEN"
  const category = (CATEGORIES.includes(catRaw) ? catRaw : "GOVERNANCE") as BoardIssueCategory
  const severity = (SEVERITIES.includes(sevRaw) ? sevRaw : "ATTENTION") as BoardIssueSeverity
  const status = (STATUSES.includes(statRaw) ? statRaw : "OPEN") as BoardIssueStatus

  const costPending = formData.get("costPending") === "on" || formData.get("costPending") === "true"
  const costRaw = Number(formData.get("costEstimate"))
  const costEstimate = costPending || !Number.isFinite(costRaw) || costRaw <= 0 ? null : costRaw

  const data = {
    title,
    detail: ((formData.get("detail") as string) || "").trim() || null,
    category,
    severity,
    status,
    owner: ((formData.get("owner") as string) || "").trim() || null,
    dueDate: dateOnly((formData.get("dueDate") as string) || null),
    costEstimate,
    costPending,
    resolvedAt: status === "RESOLVED" ? new Date() : null,
  }

  if (id) {
    const existing = await db.boardIssue.findFirst({ where: { id, orgId } })
    if (!existing) return { success: false, error: "Not found" }
    // Keep the original resolvedAt if it was already resolved and stays resolved.
    await db.boardIssue.update({
      where: { id },
      data: {
        ...data,
        resolvedAt:
          status === "RESOLVED" ? existing.resolvedAt ?? new Date() : null,
      },
    })
  } else {
    await db.boardIssue.create({ data: { ...data, orgId, createdById: session.user.id } })
  }
  revalidate()
  return { success: true }
}

export async function setBoardIssueStatus(id: string, status: string): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManage(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  if (!STATUSES.includes(status)) return { success: false, error: "Bad status" }
  const existing = await db.boardIssue.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!existing) return { success: false, error: "Not found" }
  await db.boardIssue.update({
    where: { id },
    data: {
      status: status as BoardIssueStatus,
      resolvedAt: status === "RESOLVED" ? existing.resolvedAt ?? new Date() : null,
    },
  })
  revalidate()
  return { success: true }
}

export async function deleteBoardIssue(id: string): Promise<Result> {
  const session = await auth()
  if (!session?.user.orgId || !canManage(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }
  const existing = await db.boardIssue.findFirst({ where: { id, orgId: session.user.orgId } })
  if (!existing) return { success: false, error: "Not found" }
  await db.boardIssue.delete({ where: { id } })
  revalidate()
  return { success: true }
}
