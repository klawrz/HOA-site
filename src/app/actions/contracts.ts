"use server"

import Anthropic from "@anthropic-ai/sdk"
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
  role: string | null,
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

// Same in-memory, per-process rate-limit pattern as ask-hope.ts - fine for
// a single dev server, resets on restart. Flagged there as a real gap for
// production; not re-litigated here.
const EXTRACT_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const EXTRACT_RATE_LIMIT_MAX_REQUESTS = 20
const extractRequestLog = new Map<string, number[]>()

function checkExtractRateLimit(userId: string): boolean {
  const now = Date.now()
  const recent = (extractRequestLog.get(userId) ?? []).filter((t) => now - t < EXTRACT_RATE_LIMIT_WINDOW_MS)
  if (recent.length >= EXTRACT_RATE_LIMIT_MAX_REQUESTS) {
    extractRequestLog.set(userId, recent)
    return false
  }
  recent.push(now)
  extractRequestLog.set(userId, recent)
  return true
}

const EXTRACT_TOOL_NAME = "extract_contract_fields"

const EXTRACT_TOOL = {
  name: EXTRACT_TOOL_NAME,
  description: "Record the key fields read from a signed contract document.",
  input_schema: {
    type: "object" as const,
    properties: {
      title: { type: "string", description: "A short descriptive title, e.g. 'Landscaping Services 2026'" },
      contractorName: { type: "string", description: "The contractor/vendor's name or company name" },
      contractorEmail: { type: ["string", "null"], description: "Contractor's email if stated, else null" },
      contractorCompany: { type: ["string", "null"], description: "Contractor's company name if distinct from contractorName, else null" },
      startDate: { type: "string", description: "Contract start/effective date, YYYY-MM-DD" },
      endDate: { type: ["string", "null"], description: "Contract end date if stated, YYYY-MM-DD, else null" },
      amount: { type: ["number", "null"], description: "The contract amount/fee as a plain number, else null" },
      type: { type: "string", enum: ["RECURRING", "PROJECT", "CRITICAL"], description: "RECURRING for ongoing services/utilities, PROJECT for one-off work, CRITICAL for insurance or government/regulatory contracts" },
      billingPeriod: { type: ["string", "null"], enum: ["WEEKLY", "MONTHLY", "YEARLY", null], description: "Only when type is RECURRING, else null" },
      description: { type: "string", description: "A 1-2 sentence summary of the scope of work" },
    },
    required: ["title", "contractorName", "startDate", "type", "description"],
  },
}

interface ExtractedContractFields {
  title: string
  contractorName: string
  contractorEmail: string | null
  contractorCompany: string | null
  startDate: string
  endDate: string | null
  amount: number | null
  type: ContractType
  billingPeriod: BillingPeriod | null
  description: string
}

export async function extractContractFromFile(formData: FormData): Promise<
  | { success: true; fields: ExtractedContractFields; fileUrl: string; matchedContractorId: string | null }
  | { success: false; error: string }
> {
  const session = await auth()
  if (!session?.user.orgId) return { success: false, error: "Please sign in again." }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { success: false, error: "Document reading isn't set up yet - enter the details manually." }

  if (!checkExtractRateLimit(session.user.id)) {
    return { success: false, error: "Too many uploads in a short time - please wait a few minutes and try again." }
  }

  const uploaded = formData.get("file")
  if (!(uploaded instanceof File) || uploaded.size === 0) {
    return { success: false, error: "Choose a file first" }
  }
  const mimeType = uploaded.type
  const supportedType =
    mimeType === "application/pdf" ? "document" : mimeType === "image/png" || mimeType === "image/jpeg" ? "image" : null
  if (!supportedType) {
    return { success: false, error: "Only PDF, PNG, or JPG files can be read automatically" }
  }

  const saved = await resolveUploadedFileUrl(formData, null, "contracts")
  if (!saved.success || !saved.url) return { success: false, error: saved.success ? "Upload failed" : saved.error }

  const buffer = Buffer.from(await uploaded.arrayBuffer())
  const base64 = buffer.toString("base64")

  const anthropic = new Anthropic({ apiKey, timeout: 30_000 })

  try {
    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      max_tokens: 1024,
      system:
        "You extract key fields from a signed HOA vendor contract document to pre-fill a form. Read the attached document carefully and call extract_contract_fields with your best reading of each field. Use null for anything not stated in the document. Dates must be YYYY-MM-DD.",
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            {
              type: supportedType,
              source: { type: "base64", media_type: mimeType, data: base64 },
            } as Anthropic.DocumentBlockParam | Anthropic.ImageBlockParam,
            { type: "text", text: "Extract this contract's key fields." },
          ],
        },
      ],
    })

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === EXTRACT_TOOL_NAME
    )
    if (!toolUse) return { success: false, error: "Couldn't read that document - try entering the details manually." }

    const fields = toolUse.input as ExtractedContractFields

    let matchedContractorId: string | null = null
    if (fields.contractorName || fields.contractorEmail) {
      const contractors = await db.membership.findMany({
        where: { orgId: session.user.orgId, role: "CONTRACTOR" },
        include: { user: true },
      })
      const nameLower = fields.contractorName?.trim().toLowerCase()
      const emailLower = fields.contractorEmail?.trim().toLowerCase()
      const match = contractors.find(
        (c) =>
          (emailLower && c.user.email.toLowerCase() === emailLower) ||
          (nameLower && c.user.name?.trim().toLowerCase() === nameLower)
      )
      matchedContractorId = match?.userId ?? null
    }

    return { success: true, fields, fileUrl: saved.url, matchedContractorId }
  } catch {
    return { success: false, error: "Couldn't read that document - try entering the details manually." }
  }
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
