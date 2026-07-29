"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { BillingPeriod, ContractType, PMAccessArea } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { resolveFileUrl as resolveUploadedFileUrl } from "@/lib/file-upload"

const CONTRACT_PATHS = [
  "/dashboard/account/contracts",
  "/dashboard/board/contracts",
  "/dashboard/property-manager/contracts",
  "/dashboard/contractor/contracts",
]

function revalidateContractPaths(unitId?: string | null) {
  for (const path of CONTRACT_PATHS) revalidatePath(path)
  if (unitId) revalidatePath(`/dashboard/owner/units/${unitId}`)
}

function resolveFileUrl(formData: FormData, fallbackUrl: string | null) {
  return resolveUploadedFileUrl(formData, fallbackUrl, "contracts")
}

function readContractFormData(formData: FormData) {
  return {
    title: (formData.get("title") as string) ?? "",
    type: formData.get("type") as ContractType,
    contractorId: (formData.get("contractorId") as string) ?? "",
    startDate: new Date(formData.get("startDate") as string),
    endDate: formData.get("endDate") ? new Date(formData.get("endDate") as string) : null,
    reminderDaysBefore: formData.get("reminderDaysBefore")
      ? Number(formData.get("reminderDaysBefore"))
      : 30,
    amount: formData.get("amount") ? parseFloat(formData.get("amount") as string) : null,
    billingPeriod:
      formData.get("type") === "RECURRING" && formData.get("billingPeriod")
        ? (formData.get("billingPeriod") as BillingPeriod)
        : null,
    description: (formData.get("description") as string) || null,
    fileUrl: (formData.get("fileUrl") as string) || null,
  }
}

// Property-level contracts: Account Owner/Board Member always (own org),
// or PM staff holding a MANAGE grant on the CONTRACTS area for that org -
// mirrors the DOCUMENTS access-grant pattern used for compliance records.
async function canManagePropertyContracts(
  role: string,
  userId: string,
  orgId: string,
  sessionOrgId: string | null | undefined
) {
  if ((role === "ACCOUNT_OWNER" || role === "BOARD_MEMBER") && sessionOrgId === orgId) return true
  if (role === "PROPERTY_MANAGER") {
    const grant = await db.pMAccessGrant.findFirst({
      where: { orgId, area: PMAccessArea.CONTRACTS, level: "MANAGE", membership: { userId } },
    })
    return !!grant
  }
  return false
}

// Unit-level contracts: the Owner retains control of their own unit, same
// as UnitContact/UnitManagerAssignment - no PM/Board authority here.
async function requireCurrentOwner(unitId: string, userId: string) {
  return db.unitOwnership.findFirst({ where: { unitId, ownerId: userId, isCurrent: true } })
}

export async function createPropertyContract(orgId: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false }
  if (!(await canManagePropertyContracts(session.user.role, session.user.id, orgId, session.user.orgId))) {
    return { success: false }
  }

  const fields = readContractFormData(formData)
  const file = await resolveFileUrl(formData, fields.fileUrl)
  if (!file.success) return { success: false, error: file.error }

  await db.contract.create({
    data: {
      orgId,
      scope: "PROPERTY",
      ...fields,
      fileUrl: file.url,
      status: "ACTIVE",
    },
  })

  revalidateContractPaths()
  return { success: true }
}

export async function createUnitContract(unitId: string, formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") return { success: false }
  if (!(await requireCurrentOwner(unitId, session.user.id))) return { success: false }

  const unit = await db.unit.findUnique({ where: { id: unitId } })
  if (!unit) return { success: false }

  const fields = readContractFormData(formData)
  const file = await resolveFileUrl(formData, fields.fileUrl)
  if (!file.success) return { success: false, error: file.error }

  await db.contract.create({
    data: {
      orgId: unit.orgId,
      scope: "UNIT",
      unitId,
      ...fields,
      fileUrl: file.url,
      status: "ACTIVE",
    },
  })

  revalidateContractPaths(unitId)
  return { success: true }
}

export async function updateContractStatus(contractId: string, status: string) {
  const session = await auth()
  if (!session) return { success: false }

  const contract = await db.contract.findUnique({ where: { id: contractId } })
  if (!contract) return { success: false }

  const allowed =
    contract.scope === "PROPERTY"
      ? await canManagePropertyContracts(session.user.role, session.user.id, contract.orgId, session.user.orgId)
      : session.user.role === "OWNER" &&
        contract.unitId !== null &&
        !!(await requireCurrentOwner(contract.unitId, session.user.id))
  if (!allowed) return { success: false }

  await db.contract.update({ where: { id: contractId }, data: { status } })

  revalidateContractPaths(contract.unitId)
  return { success: true }
}
