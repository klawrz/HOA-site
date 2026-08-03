"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { AssessmentType, PaymentMethod } from "@/generated/prisma"
import { parseDateOnly } from "@/lib/occupancy"
import { effectiveAllocations } from "@/lib/unit-allocation"

function canManageAssessments(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

// Only a Board governance act can actually issue a charge to owners -
// mirrors Budget's approve/draft split (PM alone can't flip a budget to
// APPROVED either).
function canIssueAssessment(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || isBoardMember
}

function revalidateAssessmentPaths() {
  revalidatePath("/dashboard/owner/financial")
  revalidatePath("/dashboard/owner/financial/dues")
  revalidatePath("/dashboard/owner/governance/board/finances/assessments")
  revalidatePath("/dashboard/board/finances/assessments")
  revalidatePath("/dashboard/property-manager/finances/assessments")
}

export async function createAssessment(data: {
  title: string
  type?: AssessmentType
  totalAmount: number
  dueDate: string
  budgetId?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageAssessments(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const title = data.title.trim()
  if (!title) return { success: false, error: "Title required" }
  if (!data.totalAmount || data.totalAmount <= 0) {
    return { success: false, error: "Total amount must be greater than zero" }
  }

  const units = await db.unit.findMany({ where: { orgId: session.user.orgId } })
  if (units.length === 0) return { success: false, error: "No units on file" }

  const customTotal = units.reduce((s, u) => s + (u.allocationPercent ?? 0), 0)
  if (customTotal > 100.5) {
    return {
      success: false,
      error: `Custom unit allocations exceed 100% (currently ${customTotal.toFixed(2)}%) - adjust them in Unit Allocations first`,
    }
  }

  const percents = effectiveAllocations(units)

  const assessment = await db.assessment.create({
    data: {
      orgId: session.user.orgId,
      title,
      type: data.type ?? "REGULAR_DUES",
      totalAmount: data.totalAmount,
      dueDate: parseDateOnly(data.dueDate),
      budgetId: data.budgetId || null,
      notes: data.notes || null,
      createdById: session.user.id,
      charges: {
        create: units.map((u) => ({
          unitId: u.id,
          amountDue: Math.round(data.totalAmount * ((percents.get(u.id) ?? 0) / 100) * 100) / 100,
        })),
      },
    },
  })

  revalidateAssessmentPaths()
  return { success: true, id: assessment.id }
}

export async function deleteAssessment(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageAssessments(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const assessment = await db.assessment.findUnique({ where: { id } })
  if (!assessment || assessment.orgId !== session.user.orgId) return { success: false }
  if (assessment.status !== "DRAFT") return { success: false, error: "Only draft assessments can be deleted" }

  await db.assessment.delete({ where: { id } })
  revalidateAssessmentPaths()
  return { success: true }
}

export async function issueAssessment(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canIssueAssessment(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const assessment = await db.assessment.findUnique({ where: { id } })
  if (!assessment || assessment.orgId !== session.user.orgId) return { success: false }
  if (assessment.status !== "DRAFT") return { success: false }

  await db.assessment.update({ where: { id }, data: { status: "ISSUED" } })
  revalidateAssessmentPaths()
  return { success: true }
}

export async function recordPayment(
  chargeId: string,
  data: { amountPaid: number; paymentMethod?: PaymentMethod; paidAt?: string; notes?: string }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageAssessments(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const charge = await db.assessmentCharge.findUnique({ where: { id: chargeId }, include: { assessment: true } })
  if (!charge || charge.assessment.orgId !== session.user.orgId) return { success: false }
  if (data.amountPaid < 0) return { success: false, error: "Amount can't be negative" }

  await db.assessmentCharge.update({
    where: { id: chargeId },
    data: {
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod || null,
      paidAt: data.amountPaid > 0 ? (data.paidAt ? parseDateOnly(data.paidAt) : new Date()) : null,
      notes: data.notes || null,
    },
  })

  revalidateAssessmentPaths()
  return { success: true }
}
