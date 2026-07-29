"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { ComplianceDocumentCategory, HomeownerMeetingDocType, PMAccessArea } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { resolveFileUrl as resolveUploadedFileUrl } from "@/lib/file-upload"

function readComplianceDocumentFormData(formData: FormData) {
  const bool = (v: FormDataEntryValue | null) => (v === "true" ? true : v === "false" ? false : undefined)
  return {
    title: (formData.get("title") as string) ?? "",
    category: formData.get("category") as ComplianceDocumentCategory,
    description: (formData.get("description") as string) || null,
    fileUrl: (formData.get("fileUrl") as string) || null,
    language: (formData.get("language") as string) || null,
    issuedAt: formData.get("issuedAt") ? new Date(formData.get("issuedAt") as string) : null,
    expiresAt: formData.get("expiresAt") ? new Date(formData.get("expiresAt") as string) : null,
    reminderDaysBefore: formData.get("reminderDaysBefore")
      ? Number(formData.get("reminderDaysBefore"))
      : 30,
    meetingYear: formData.get("meetingYear") ? Number(formData.get("meetingYear")) : null,
    meetingDocType: (formData.get("meetingDocType") as HomeownerMeetingDocType) || null,
    minutesFilingRequired: bool(formData.get("minutesFilingRequired")) ?? null,
    minutesFiled: bool(formData.get("minutesFiled")) ?? null,
    minutesFiledAt: formData.get("minutesFiledAt")
      ? new Date(formData.get("minutesFiledAt") as string)
      : null,
  }
}

function resolveFileUrl(formData: FormData, fallbackUrl: string | null) {
  return resolveUploadedFileUrl(formData, fallbackUrl, "compliance-documents")
}

async function getOwnCompany(userId: string) {
  const membership = await db.pMStaffMembership.findFirst({
    where: { userId },
    include: { company: true },
  })
  return membership?.company ?? null
}

async function requireCompanyAdmin(companyId: string, userId: string) {
  const company = await db.propertyManagementCompany.findUnique({ where: { id: companyId } })
  return company?.createdById === userId ? company : null
}

// Whether the signed-in PM staff member may manage compliance documents for
// a given HOA - mirrors the DOCUMENTS access grant used for tickets/contracts.
async function canManageOrgDocuments(userId: string, orgId: string) {
  const grant = await db.pMAccessGrant.findFirst({
    where: {
      org: { id: orgId },
      area: PMAccessArea.DOCUMENTS,
      level: "MANAGE",
      membership: { userId },
    },
  })
  return !!grant
}

export async function createOrgComplianceDocument(orgId: string, formData: FormData) {
  const session = await auth()
  if (!session) return { success: false }

  const allowed =
    ((session.user.role === "ACCOUNT_OWNER" || session.user.role === "BOARD_MEMBER") &&
      session.user.orgId === orgId) ||
    (session.user.role === "PROPERTY_MANAGER" && (await canManageOrgDocuments(session.user.id, orgId)))
  if (!allowed) return { success: false }

  const fields = readComplianceDocumentFormData(formData)
  const file = await resolveFileUrl(formData, fields.fileUrl)
  if (!file.success) return { success: false, error: file.error }

  await db.complianceDocument.create({
    data: {
      orgId,
      uploadedById: session.user.id,
      ...fields,
      fileUrl: file.url,
    },
  })

  revalidatePath("/dashboard/account/compliance")
  revalidatePath("/dashboard/board/compliance")
  revalidatePath("/dashboard/property-manager/compliance")
  return { success: true }
}

export async function createCompanyComplianceDocument(formData: FormData) {
  const session = await auth()
  if (!session || session.user.role !== "PROPERTY_MANAGER") return { success: false }

  const company = await getOwnCompany(session.user.id)
  if (!company || !(await requireCompanyAdmin(company.id, session.user.id))) return { success: false }

  const fields = readComplianceDocumentFormData(formData)
  const file = await resolveFileUrl(formData, fields.fileUrl)
  if (!file.success) return { success: false, error: file.error }

  await db.complianceDocument.create({
    data: {
      companyId: company.id,
      uploadedById: session.user.id,
      ...fields,
      fileUrl: file.url,
    },
  })

  revalidatePath("/dashboard/property-manager/compliance")
  return { success: true }
}

export async function deleteComplianceDocument(documentId: string) {
  const session = await auth()
  if (!session) return { success: false }

  const doc = await db.complianceDocument.findUnique({ where: { id: documentId } })
  if (!doc) return { success: false }

  let allowed = false
  if (doc.orgId) {
    allowed =
      (session.user.role === "ACCOUNT_OWNER" || session.user.role === "BOARD_MEMBER") &&
      session.user.orgId === doc.orgId
    if (!allowed && session.user.role === "PROPERTY_MANAGER") {
      allowed = await canManageOrgDocuments(session.user.id, doc.orgId)
    }
  } else if (doc.companyId) {
    allowed =
      session.user.role === "PROPERTY_MANAGER" &&
      !!(await requireCompanyAdmin(doc.companyId, session.user.id))
  }
  if (!allowed) return { success: false }

  await db.complianceDocument.delete({ where: { id: documentId } })

  revalidatePath("/dashboard/account/compliance")
  revalidatePath("/dashboard/board/compliance")
  revalidatePath("/dashboard/property-manager/compliance")
  return { success: true }
}
