"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { UnitChargeType, PaymentMethod } from "@/generated/prisma"
import { parseDateOnly } from "@/lib/occupancy"
import { UNIT_CHARGE_TYPES } from "@/lib/charges"

// A Board member or the PM can raise ad-hoc unit charges (water, fees, other).
function canManageCharges(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

function revalidateChargePaths() {
  revalidatePath("/dashboard/board/finances/charges")
  revalidatePath("/dashboard/property-manager/finances/charges")
  revalidatePath("/dashboard/owner/financial")
  revalidatePath("/dashboard/owner/financial/dues")
}

export async function createUnitCharge(data: {
  scope: "UNIT" | "ALL"
  unitId?: string
  type: UnitChargeType
  label?: string
  amount: number
  chargedOn: string
  dueDate?: string
  notes?: string
}) {
  const session = await auth()
  if (!session?.user.orgId || !canManageCharges(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  if (!UNIT_CHARGE_TYPES.includes(data.type)) return { success: false, error: "Invalid charge type" }
  if (!data.amount || data.amount <= 0) return { success: false, error: "Amount must be greater than zero" }
  if (!data.chargedOn) return { success: false, error: "Charge date required" }

  let unitIds: string[]
  if (data.scope === "ALL") {
    const units = await db.unit.findMany({ where: { orgId: session.user.orgId }, select: { id: true } })
    if (units.length === 0) return { success: false, error: "No units on file" }
    unitIds = units.map((u) => u.id)
  } else {
    if (!data.unitId) return { success: false, error: "Pick a unit" }
    const unit = await db.unit.findUnique({ where: { id: data.unitId }, select: { orgId: true } })
    if (!unit || unit.orgId !== session.user.orgId) return { success: false }
    unitIds = [data.unitId]
  }

  await db.unitCharge.createMany({
    data: unitIds.map((unitId) => ({
      orgId: session.user.orgId!,
      unitId,
      type: data.type,
      label: data.label?.trim() || null,
      amount: data.amount,
      chargedOn: parseDateOnly(data.chargedOn),
      dueDate: data.dueDate ? parseDateOnly(data.dueDate) : null,
      notes: data.notes?.trim() || null,
      createdById: session.user.id,
    })),
  })

  revalidateChargePaths()
  return { success: true, count: unitIds.length }
}

export async function recordChargePayment(
  chargeId: string,
  data: { amountPaid: number; paymentMethod?: PaymentMethod; paidAt?: string }
) {
  const session = await auth()
  if (!session?.user.orgId || !canManageCharges(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  const charge = await db.unitCharge.findUnique({ where: { id: chargeId }, select: { orgId: true } })
  if (!charge || charge.orgId !== session.user.orgId) return { success: false }
  if (data.amountPaid < 0) return { success: false, error: "Amount can't be negative" }

  await db.unitCharge.update({
    where: { id: chargeId },
    data: {
      amountPaid: data.amountPaid,
      paymentMethod: data.paymentMethod || null,
      paidAt: data.amountPaid > 0 ? (data.paidAt ? parseDateOnly(data.paidAt) : new Date()) : null,
    },
  })

  revalidateChargePaths()
  return { success: true }
}

export async function deleteUnitCharge(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageCharges(session.user.role, session.user.isBoardMember)) {
    return { success: false }
  }
  const charge = await db.unitCharge.findUnique({ where: { id }, select: { orgId: true } })
  if (!charge || charge.orgId !== session.user.orgId) return { success: false }

  await db.unitCharge.delete({ where: { id } })
  revalidateChargePaths()
  return { success: true }
}
