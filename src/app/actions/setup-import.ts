"use server"

import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/auth"
import { DocumentCategory } from "@/generated/prisma"

const DOCUMENT_CATEGORIES: DocumentCategory[] = [
  "MEETING_MINUTES",
  "BYLAWS",
  "INSURANCE",
  "RESOLUTION",
  "CONTRACT",
  "FINANCIAL",
  "POLICY",
  "OTHER",
]

// Same in-memory, per-process rate-limit pattern as contracts.ts/ask-hope.ts
// - fine for a single dev server, resets on restart. Not re-litigated here.
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

const EXTRACT_TOOL_NAME = "extract_hoa_setup_fields"

// One broad, document-agnostic schema rather than a per-document-type
// classifier - a constitution, meeting minutes, a budget, a vendor
// contract, and a utility bill each surface a different subset of these
// fields. Claude leaves whatever a given document doesn't contain as
// null/empty rather than guessing.
const EXTRACT_TOOL = {
  name: EXTRACT_TOOL_NAME,
  description: "Record whatever HOA setup information can be read from this document.",
  input_schema: {
    type: "object" as const,
    properties: {
      documentCategory: {
        type: "string",
        enum: DOCUMENT_CATEGORIES,
        description:
          "What kind of document this is, for filing it in the org's document library: MEETING_MINUTES (minutes or a call to a meeting), BYLAWS (constitution, bylaws, deed, or other founding/governing document), INSURANCE, RESOLUTION (a formal board resolution), CONTRACT (a vendor/management agreement), FINANCIAL (a budget, statement, or invoice), POLICY (a rule or guideline document), or OTHER if none of these fit.",
      },
      orgName: { type: ["string", "null"], description: "The HOA's name, else null" },
      legalEntityName: { type: ["string", "null"], description: "The HOA's registered legal entity name if stated, else null" },
      addressLine1: { type: ["string", "null"] },
      addressLine2: { type: ["string", "null"] },
      city: { type: ["string", "null"] },
      state: { type: ["string", "null"] },
      postalCode: { type: ["string", "null"] },
      country: { type: ["string", "null"] },
      accountOwnerName: {
        type: ["string", "null"],
        description:
          "Name of the person actually administering/managing the HOA day-to-day (e.g. the HOA president, administrator, or managing owner), if stated. Never a notary, attorney, witness, or other party who merely certified, witnessed, or filed the document - a legal deed's notary block names the certifying notary, not the HOA's administrator, so leave this null if only a notary/certifying official is named.",
      },
      accountOwnerTitle: { type: ["string", "null"] },
      accountOwnerEmail: { type: ["string", "null"] },
      accountOwnerPhone: { type: ["string", "null"] },
      meetingDate: {
        type: ["string", "null"],
        description:
          "Date of a specific board/owners' meeting this document is the minutes or call for, YYYY-MM-DD, else null. Do NOT use a legal entity's registration, incorporation, or deed-signing date for this field - that is the HOA's founding date, not a meeting date.",
      },
      units: {
        type: "array",
        description: "Any individual units/lots listed by number, else an empty array",
        items: {
          type: "object",
          properties: {
            number: { type: "string" },
            building: { type: ["string", "null"] },
          },
          required: ["number"],
        },
      },
      boardPositions: {
        type: "array",
        description: "Board seats/titles and their holders if named (e.g. President, Treasurer), else an empty array",
        items: {
          type: "object",
          properties: {
            title: { type: "string" },
            holderName: { type: ["string", "null"] },
            holderEmail: { type: ["string", "null"] },
            termStart: {
              type: ["string", "null"],
              description:
                "YYYY-MM-DD this specific officer's term/appointment began, only if the document actually states it for them by name - else null. Never the HOA's registration/incorporation/founding date, and never the same blanket date reused across every seat unless the document genuinely states each of them took office that day.",
            },
          },
          required: ["title"],
        },
      },
      owners: {
        type: "array",
        description:
          "A roster of unit owners/residents with contact info, if this document is that kind of list (e.g. an owner directory or contact sheet), else an empty array. Include EVERY row that has a unit number, even if it has no email - a real roster commonly gives phone numbers but not emails for most units, and those rows still matter (they can be filled in and invited later). Only unitNumber is required per entry; leave email null rather than omitting the row. Note: some rosters label a per-unit delegate as \"Property Manager\" even though it's really a single unit's manager/caretaker, not the HOA's org-wide management company - if a name is tied to one specific unit rather than the whole HOA, record it as that unit's unitManagerName/unitManagerCompany here, not as pmCompany.",
        items: {
          type: "object",
          properties: {
            unitNumber: { type: "string" },
            name: { type: ["string", "null"] },
            email: { type: ["string", "null"], description: "Email if stated, else null - an entry with no email can't be invited automatically" },
            phone: { type: ["string", "null"], description: "Owner's phone number(s) as stated, e.g. \"Greg: 226.678.0829 Janice: 226.678.0891\" - keep multiple owners' numbers together as one string rather than picking just one" },
            emergencyContactName: { type: ["string", "null"] },
            emergencyContactPhone: { type: ["string", "null"] },
            unitManagerName: { type: ["string", "null"], description: "Name of a person delegated to manage this specific unit (sometimes labeled \"Property Manager\" on a per-unit roster), else null" },
            unitManagerCompany: { type: ["string", "null"] },
            unitManagerEmail: { type: ["string", "null"] },
            unitManagerPhone: { type: ["string", "null"] },
          },
          required: ["unitNumber"],
        },
      },
      pmCompany: {
        type: ["object", "null"],
        description:
          "The THIRD-PARTY management company/vendor engaged to manage the HOA - the \"Manager\"/\"Agent\" party in a management contract, NEVER the HOA/association itself (the \"Client\"/\"Owner\"/\"Association\" party). A management contract always names both parties; legalName must be the vendor being hired, not the HOA hiring them - if you can't tell the two apart with confidence, leave this null rather than guessing. Else null if no such vendor is named.",
        properties: {
          legalName: { type: "string" },
          email: { type: ["string", "null"] },
          phone: { type: ["string", "null"] },
          primaryContactName: { type: ["string", "null"] },
        },
      },
      budgetLineItems: {
        type: "array",
        description: "Budget line items (label + amount) if this is a budget document, else an empty array",
        items: {
          type: "object",
          properties: {
            label: { type: "string" },
            budgetedAmount: { type: "number" },
          },
          required: ["label", "budgetedAmount"],
        },
      },
    },
    required: ["documentCategory", "units", "boardPositions", "owners", "budgetLineItems"],
  },
}

export interface ExtractedSetupFields {
  documentCategory: DocumentCategory
  orgName: string | null
  legalEntityName: string | null
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
  accountOwnerName: string | null
  accountOwnerTitle: string | null
  accountOwnerEmail: string | null
  accountOwnerPhone: string | null
  meetingDate: string | null
  units: { number: string; building: string | null }[]
  boardPositions: { title: string; holderName: string | null; holderEmail: string | null; termStart: string | null }[]
  owners: {
    unitNumber: string
    name: string | null
    email: string | null
    phone: string | null
    emergencyContactName: string | null
    emergencyContactPhone: string | null
    unitManagerName: string | null
    unitManagerCompany: string | null
    unitManagerEmail: string | null
    unitManagerPhone: string | null
  }[]
  pmCompany: { legalName: string; email: string | null; phone: string | null; primaryContactName: string | null } | null
  budgetLineItems: { label: string; budgetedAmount: number }[]
}

export async function extractSetupDocument(formData: FormData): Promise<
  { success: true; fields: ExtractedSetupFields } | { success: false; error: string }
> {
  const session = await auth()
  if (!session?.user.orgId || session.user.role !== "ACCOUNT_OWNER") {
    return { success: false, error: "Please sign in again." }
  }

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
  const ext = (uploaded.name || "").toLowerCase().split(".").pop() ?? ""

  const isPdf = mimeType === "application/pdf"
  const isImage = mimeType === "image/png" || mimeType === "image/jpeg"
  const isCsv = mimeType === "text/csv" || ext === "csv"
  // .xlsx/.xls parsing needs a real spreadsheet library, and the only
  // version of the common one (xlsx/SheetJS) still published to npm has
  // known high-severity prototype-pollution and ReDoS advisories in its
  // parsing path - not something to run on arbitrary uploaded files. CSV
  // needs no parsing at all (it's already plain text), so point people
  // there instead of accepting a format we can't safely read.
  const isUnsupportedSpreadsheet =
    ext === "xlsx" || ext === "xls" || mimeType.includes("spreadsheetml") || mimeType === "application/vnd.ms-excel"
  if (isUnsupportedSpreadsheet) {
    return {
      success: false,
      error:
        "Excel files aren't read directly yet - from Google Sheets, use File > Download > Comma Separated Values (.csv) and upload that instead, or Download > PDF.",
    }
  }
  if (!isPdf && !isImage && !isCsv) {
    return { success: false, error: "Only PDF, PNG, JPG, or CSV files can be read automatically" }
  }

  const anthropic = new Anthropic({ apiKey, timeout: 30_000 })

  try {
    const content: (Anthropic.DocumentBlockParam | Anthropic.ImageBlockParam | Anthropic.TextBlockParam)[] = []
    if (isCsv) {
      const csvText = await uploaded.text()
      content.push({ type: "text", text: `CSV file contents:\n\n${csvText}` })
    } else {
      const buffer = Buffer.from(await uploaded.arrayBuffer())
      const base64 = buffer.toString("base64")
      content.push({
        type: isPdf ? "document" : "image",
        source: { type: "base64", media_type: mimeType, data: base64 },
      } as Anthropic.DocumentBlockParam | Anthropic.ImageBlockParam)
    }
    content.push({ type: "text", text: "Extract whatever HOA setup information you can find in this document." })

    const response = await anthropic.messages.create({
      model: "claude-sonnet-5",
      // A dense owner roster (a dozen-plus units, each with name/email/
      // phone/emergency contact/unit manager detail) easily runs past a
      // couple thousand tokens of tool-call JSON - 2048 was cutting real
      // documents off mid-array, silently dropping every entry after
      // wherever the truncation landed.
      max_tokens: 8192,
      system:
        "You extract HOA setup information from a document (this could be a constitution/bylaws, meeting minutes, a budget, a vendor/management contract, a utility bill, or an owner/resident roster or contact list, as a PDF/image or as raw CSV text) to pre-fill a setup form. Read the attached content carefully and call extract_hoa_setup_fields with your best reading of each field. Use null (or an empty array for list fields) for anything not stated in the document - never guess or fabricate a value, and never reuse one date or name across multiple fields/entries just because it's the only date or name in the document. Dates must be YYYY-MM-DD. A roster may label a per-unit delegate as \"Property Manager\" even though it names one specific unit, not the whole HOA - that belongs in that owner's unitManagerName/unitManagerCompany fields, not the top-level pmCompany field (which is only for a company managing the entire HOA). A management contract names TWO parties - the HOA/association itself (\"Client\"/\"Owner\"/\"Association\") and the outside company being hired (\"Manager\"/\"Agent\"/\"Managing Agent\") - pmCompany.legalName is always the latter, never the HOA's own name (which belongs in orgName/legalEntityName instead). If the contract's two parties aren't clearly distinguishable, leave pmCompany null rather than guessing which one is the vendor. A founding constitution/deed names a notary or witness who certified it - that person is never the accountOwnerName (the HOA's actual administrator), and the deed's registration/signing date is never a board seat's termStart or a meetingDate. When a document doesn't actually distinguish these, leave the field null rather than filling it with the nearest available name or date.",
      tools: [EXTRACT_TOOL],
      tool_choice: { type: "tool", name: EXTRACT_TOOL_NAME },
      messages: [{ role: "user", content }],
    })

    const toolUse = response.content.find(
      (block): block is Anthropic.ToolUseBlock => block.type === "tool_use" && block.name === EXTRACT_TOOL_NAME
    )
    if (!toolUse) return { success: false, error: "Couldn't read that document - try entering the details manually." }

    // tool_choice forces a call, but doesn't guarantee the input actually
    // matches the declared schema's types - a model output can still put a
    // string, number, or single object where an array was declared. Treat
    // toolUse.input as fully untrusted rather than casting straight to
    // Partial<ExtractedSetupFields>, so a malformed field degrades to
    // empty/null instead of crashing the caller.
    const raw = toolUse.input as Record<string, unknown>
    const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null)
    const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : [])
    const obj = (v: unknown): Record<string, unknown> => (v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {})

    const fields: ExtractedSetupFields = {
      documentCategory: DOCUMENT_CATEGORIES.includes(raw.documentCategory as DocumentCategory)
        ? (raw.documentCategory as DocumentCategory)
        : "OTHER",
      orgName: str(raw.orgName),
      legalEntityName: str(raw.legalEntityName),
      addressLine1: str(raw.addressLine1),
      addressLine2: str(raw.addressLine2),
      city: str(raw.city),
      state: str(raw.state),
      postalCode: str(raw.postalCode),
      country: str(raw.country),
      accountOwnerName: str(raw.accountOwnerName),
      accountOwnerTitle: str(raw.accountOwnerTitle),
      accountOwnerEmail: str(raw.accountOwnerEmail),
      accountOwnerPhone: str(raw.accountOwnerPhone),
      meetingDate: str(raw.meetingDate),
      units: arr(raw.units)
        .map(obj)
        .filter((u) => str(u.number))
        .map((u) => ({ number: str(u.number) as string, building: str(u.building) })),
      boardPositions: arr(raw.boardPositions)
        .map(obj)
        .filter((s) => str(s.title))
        .map((s) => ({
          title: str(s.title) as string,
          holderName: str(s.holderName),
          holderEmail: str(s.holderEmail),
          termStart: str(s.termStart),
        })),
      owners: arr(raw.owners)
        .map(obj)
        .filter((o) => str(o.unitNumber))
        .map((o) => ({
          unitNumber: str(o.unitNumber) as string,
          name: str(o.name),
          email: str(o.email),
          phone: str(o.phone),
          emergencyContactName: str(o.emergencyContactName),
          emergencyContactPhone: str(o.emergencyContactPhone),
          unitManagerName: str(o.unitManagerName),
          unitManagerCompany: str(o.unitManagerCompany),
          unitManagerEmail: str(o.unitManagerEmail),
          unitManagerPhone: str(o.unitManagerPhone),
        })),
      pmCompany: (() => {
        const p = obj(raw.pmCompany)
        const legalName = str(p.legalName)
        return legalName
          ? { legalName, email: str(p.email), phone: str(p.phone), primaryContactName: str(p.primaryContactName) }
          : null
      })(),
      budgetLineItems: arr(raw.budgetLineItems)
        .map(obj)
        .filter((i) => str(i.label) && typeof i.budgetedAmount === "number")
        .map((i) => ({ label: str(i.label) as string, budgetedAmount: i.budgetedAmount as number })),
    }

    return { success: true, fields }
  } catch {
    return { success: false, error: "Couldn't read that document - try entering the details manually." }
  }
}
