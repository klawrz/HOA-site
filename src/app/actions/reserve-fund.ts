"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { ReserveTransactionType } from "@/generated/prisma"
import { parseDateOnly } from "@/lib/occupancy"
import { canManageReserveFund } from "@/lib/reserve-fund"

function revalidateReservePaths() {
  revalidatePath("/dashboard/owner/governance")
  revalidatePath("/dashboard/owner/governance/board/finances/reserve")
  revalidatePath("/dashboard/board/finances/reserve")
  revalidatePath("/dashboard/property-manager/finances/reserve")
}

export async function setReserveDetails(data: { target: number | null; policy: string; heldAt: string }) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  if (data.target != null && data.target < 0) return { success: false, error: "Target can't be negative" }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: {
      reserveTarget: data.target,
      reservePolicy: data.policy.trim() || null,
      reserveHeldAt: data.heldAt.trim() || null,
    },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function setReservePolicyFigures(data: {
  revision: string
  status: string
  asOf: string
  balance: number | null
  target: number | null
  topUpYears: number | null
  floorPct: number | null
  exchangeRate: number | null
  roofYear: number | null
  roofDrawdown: number | null
  budgetYear: number | null
  budgetLineUsd: number | null
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const nonNeg = (v: number | null) => (v == null || v < 0 ? null : v)
  if (data.topUpYears != null && data.topUpYears < 1) {
    return { success: false, error: "Years to top up must be at least 1" }
  }
  if (data.floorPct != null && (data.floorPct < 0 || data.floorPct > 100)) {
    return { success: false, error: "Floor must be between 0 and 100%" }
  }
  if (data.exchangeRate != null && data.exchangeRate <= 0) {
    return { success: false, error: "Exchange rate must be greater than zero" }
  }

  await db.organization.update({
    where: { id: session.user.orgId },
    data: {
      reserveTarget: nonNeg(data.target),
      reservePolicyRevision: data.revision.trim() || null,
      reservePolicyStatus: data.status.trim() || null,
      reservePolicyAsOf: data.asOf.trim() || null,
      reservePolicyBalance: nonNeg(data.balance),
      reservePolicyTopUpYears: data.topUpYears != null ? Math.round(data.topUpYears) : null,
      reservePolicyFloorPct: data.floorPct != null ? Math.round(data.floorPct) : null,
      reservePolicyExchangeRate: nonNeg(data.exchangeRate),
      reservePolicyRoofYear: data.roofYear != null ? Math.round(data.roofYear) : null,
      reservePolicyRoofDrawdown: nonNeg(data.roofDrawdown),
      reservePolicyBudgetYear: data.budgetYear != null ? Math.round(data.budgetYear) : null,
      reservePolicyBudgetLineUsd: nonNeg(data.budgetLineUsd),
    },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function createReserveTransaction(data: {
  type: ReserveTransactionType
  amount: number
  date: string
  description: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const description = data.description.trim()
  if (!description) return { success: false, error: "Description required" }
  if (!data.amount || data.amount <= 0) return { success: false, error: "Amount must be greater than zero" }

  await db.reserveTransaction.create({
    data: {
      orgId: session.user.orgId,
      type: data.type,
      amount: data.amount,
      date: parseDateOnly(data.date),
      description,
      createdById: session.user.id,
    },
  })

  revalidateReservePaths()
  return { success: true }
}

export async function setReserveYearComment(year: number, comment: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const trimmed = comment.trim()
  if (!trimmed) {
    await db.reserveYearNote.deleteMany({ where: { orgId: session.user.orgId, year } })
  } else {
    await db.reserveYearNote.upsert({
      where: { orgId_year: { orgId: session.user.orgId, year } },
      update: { comment: trimmed },
      create: { orgId: session.user.orgId, year, comment: trimmed },
    })
  }

  revalidateReservePaths()
  return { success: true }
}

export async function deleteReserveTransaction(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageReserveFund(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }

  const transaction = await db.reserveTransaction.findUnique({ where: { id } })
  if (!transaction || transaction.orgId !== session.user.orgId) return { success: false }

  await db.reserveTransaction.delete({ where: { id } })
  revalidateReservePaths()
  return { success: true }
}
