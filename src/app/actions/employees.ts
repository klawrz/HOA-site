"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { revalidatePath } from "next/cache"
import type { EmployeeGovIdType, EmployeeStatus } from "@/generated/prisma"

// Who can maintain the payroll-staff roster: a Board Member or the
// Property Manager only (per Dara). Same shape as canManageKeyInfo, but
// deliberately its OWN gate - Account Owner is NOT included here (they can
// still view via role preview, read-only).
function canManageEmployees(role: string, isBoardMember: boolean) {
  return role === "BOARD_MEMBER" || role === "PROPERTY_MANAGER" || isBoardMember
}

function revalidateEmployeePaths() {
  revalidatePath("/dashboard/board/employees")
  revalidatePath("/dashboard/board")
}

export interface EmployeeGovIdInput {
  type: EmployeeGovIdType
  label?: string
  value: string
}

export interface EmployeeInput {
  name: string
  employeeNumber?: string
  position?: string
  reportsTo?: string
  phone?: string
  email?: string
  homeAddress?: string
  hireDate?: string
  endDate?: string
  status: EmployeeStatus
  notes?: string
  govIds: EmployeeGovIdInput[]
}

function cleanGovIds(govIds: EmployeeGovIdInput[]) {
  return govIds
    .map((g) => ({
      type: g.type,
      label: g.type === "OTHER" ? g.label?.trim() || null : null,
      value: g.value.trim(),
    }))
    .filter((g) => g.value.length > 0)
}

// Date-only fields (hired / ended) - store as UTC midnight so the calendar
// day round-trips cleanly regardless of the server's or viewer's timezone.
// Anything that reads these back should format with timeZone: "UTC".
function parseDate(raw: string | undefined): Date | null {
  if (!raw) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return isNaN(d.getTime()) ? null : d
}

export async function createEmployee(data: EmployeeInput) {
  const session = await auth()
  if (!session?.user.orgId || !canManageEmployees(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Name is required" }

  const count = await db.employee.count({ where: { orgId: session.user.orgId } })

  await db.employee.create({
    data: {
      orgId: session.user.orgId,
      name,
      employeeNumber: data.employeeNumber?.trim() || null,
      position: data.position?.trim() || null,
      reportsTo: data.reportsTo?.trim() || null,
      phone: data.phone?.trim() || null,
      email: data.email?.trim() || null,
      homeAddress: data.homeAddress?.trim() || null,
      hireDate: parseDate(data.hireDate),
      endDate: parseDate(data.endDate),
      status: data.status,
      notes: data.notes?.trim() || null,
      sortOrder: count,
      govIds: { create: cleanGovIds(data.govIds) },
    },
  })

  revalidateEmployeePaths()
  return { success: true }
}

export async function updateEmployee(id: string, data: EmployeeInput) {
  const session = await auth()
  if (!session?.user.orgId || !canManageEmployees(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }

  const existing = await db.employee.findUnique({ where: { id } })
  if (!existing || existing.orgId !== session.user.orgId) return { success: false, error: "Not found" }

  const name = data.name.trim()
  if (!name) return { success: false, error: "Name is required" }

  // Gov IDs are a small, rarely-edited set - replace wholesale rather than
  // diffing, same approach the budget line-item editors take.
  await db.$transaction([
    db.employeeGovId.deleteMany({ where: { employeeId: id } }),
    db.employee.update({
      where: { id },
      data: {
        name,
        employeeNumber: data.employeeNumber?.trim() || null,
        position: data.position?.trim() || null,
        reportsTo: data.reportsTo?.trim() || null,
        phone: data.phone?.trim() || null,
        email: data.email?.trim() || null,
        homeAddress: data.homeAddress?.trim() || null,
        hireDate: parseDate(data.hireDate),
        endDate: parseDate(data.endDate),
        status: data.status,
        notes: data.notes?.trim() || null,
        govIds: { create: cleanGovIds(data.govIds) },
      },
    }),
  ])

  revalidateEmployeePaths()
  return { success: true }
}

export async function deleteEmployee(id: string) {
  const session = await auth()
  if (!session?.user.orgId || !canManageEmployees(session.user.role, session.user.isBoardMember)) {
    return { success: false, error: "Not authorized" }
  }

  const existing = await db.employee.findUnique({ where: { id } })
  if (!existing || existing.orgId !== session.user.orgId) return { success: false, error: "Not found" }

  await db.employee.delete({ where: { id } })

  revalidateEmployeePaths()
  return { success: true }
}
