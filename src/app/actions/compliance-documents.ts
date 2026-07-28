"use server"

import { auth } from "@/auth"
import { db } from "@/lib/db"
import { ComplianceDocumentCategory, HomeownerMeetingDocType, PMAccessArea } from "@/generated/prisma"
import { revalidatePath } from "next/cache"
import { randomUUID } from "crypto"
import { mkdir, writeFile } from "fs/promises"
import path from "path"

const MAX_UPLOAD_SIZE = 15 * 1024 * 1024 // 15MB
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "compliance-documents")

// Files are stored on local disk under public/uploads - fine for this dev
// environment, not committed to git (see .gitignore). A real deployment
// would swap this for object storage without changing the callers below.
async function saveUploadedFile(
  file: File
): Promise<{ success: true; url: string } | { success: false; error: string }> {
  if (file.size === 0) return { success: false, error: "Empty file" }
  if (file.size > MAX_UPLOAD_SIZE) return { success: false, error: "File is too large (max 15MB)" }

  await mkdir(UPLOAD_DIR, { recursive: true })
  const ext = path.extname(file.name).slice(0, 20)
  const filename = `${randomUUID()}${ext}`
  const buffer = Buffer.from(await file.arrayBuffer())
  await writeFile(path.join(UPLOAD_DIR, filename), buffer)

  return { success: true, url: `/uploads/compliance-documents/${filename}` }
}

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

async function resolveFileUrl(formData: FormData, fallbackUrl: string | null) {
  const uploaded = formData.get("file")
  if (uploaded instanceof File && uploaded.size > 0) {
    const result = await saveUploadedFile(uploaded)
    if (!result.success) return { success: false as const, error: result.error }
    return { success: true as const, url: result.url }
  }
  return { success: true as const, url: fallbackUrl }
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
