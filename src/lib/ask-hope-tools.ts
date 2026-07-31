import {
  AskHopeSession,
  getOwnerDuesAndPayments,
  getOwnerFinancialSummary,
  getTicketStatus,
  getOwnerOccupancySummary,
  searchDocuments,
  getOrgFinancialSummary,
  getOrgDuesStatus,
  getOrgTicketStatus,
} from "./ask-hope-queries"

// Index signature matches Anthropic.Tool's `input_schema` type - it's
// typed as a loose JSON-Schema-shaped record, not a strict interface.
export interface JsonSchema {
  type: "object"
  properties: Record<string, unknown>
  required?: string[]
  [key: string]: unknown
}

export interface AskHopeTool {
  name: string
  description: string
  input_schema: JsonSchema
  isAvailable: (session: AskHopeSession) => boolean
  execute: (session: AskHopeSession, args: Record<string, unknown>) => Promise<unknown>
}

// Matches the "an Owner can also independently hold Board governance
// access" pattern already used throughout the app's own canManageX(role,
// isBoardMember) helpers (see src/app/actions/assessments.ts, budgets.ts,
// reserve-fund.ts) - org-wide tools should be available to an isBoardMember
// Owner too, not just users whose primary role is BOARD_MEMBER.
function isBoardOrPm(session: AskHopeSession) {
  return (
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.isBoardMember
  )
}

function isOwnerOnly(session: AskHopeSession) {
  return session.user.role === "OWNER"
}

const EMPTY_SCHEMA: JsonSchema = { type: "object", properties: {} }

const STATUS_FILTER_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    status: {
      type: "string",
      enum: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      description: "Optional filter",
    },
  },
}

// The registry - query tools only. respond_to_user is not here; it's the
// terminal action every turn must end with, and the orchestrator
// (src/app/actions/ask-hope.ts) handles it directly since "return this as
// the final answer" isn't a query with a result to feed back into the loop.
export const ASK_HOPE_TOOLS: AskHopeTool[] = [
  {
    name: "get_owner_dues_and_payments",
    description:
      "Get the signed-in owner's outstanding HOA dues and assessment charges across all their units - what's owed, what's been paid, and due dates.",
    input_schema: EMPTY_SCHEMA,
    isAvailable: isOwnerOnly,
    execute: async (session) => getOwnerDuesAndPayments(session),
  },
  {
    name: "get_owner_financial_summary",
    description:
      "Get the signed-in owner's rental income, active contracts/expenses, and a per-unit summary.",
    input_schema: EMPTY_SCHEMA,
    isAvailable: isOwnerOnly,
    execute: async (session) => getOwnerFinancialSummary(session),
  },
  {
    name: "get_ticket_status",
    description:
      "Get maintenance/trouble ticket status. Owners see tickets for their own units plus common-area tickets; renters see only tickets they personally submitted.",
    input_schema: STATUS_FILTER_SCHEMA,
    isAvailable: (session) => session.user.role === "OWNER" || session.user.role === "RENTER",
    execute: async (session, args) => getTicketStatus(session, args),
  },
  {
    name: "get_owner_occupancy_summary",
    description:
      "Get the signed-in owner's units' current occupancy status and recent occupancy log entries (who's staying, guest vs. renter, dates).",
    input_schema: {
      type: "object",
      properties: {
        unitId: { type: "string", description: "Optional - limit to one specific unit id" },
      },
    },
    isAvailable: isOwnerOnly,
    execute: async (session, args) => getOwnerOccupancySummary(session, args),
  },
  {
    name: "search_documents",
    description:
      "Keyword search the HOA's document library (bylaws, policies, meeting minutes, etc.) for a topic. Only returns documents that have extracted text content and match the search terms - not every document has searchable content yet, so an empty result doesn't necessarily mean the topic isn't covered anywhere.",
    input_schema: {
      type: "object",
      properties: {
        query: { type: "string", description: 'Search terms, e.g. "quiet hours" or "pet policy"' },
      },
      required: ["query"],
    },
    isAvailable: (session) => session.user.role === "OWNER" || isBoardOrPm(session),
    execute: async (session, args) => searchDocuments(session, args),
  },
  {
    name: "get_org_financial_summary",
    description:
      "Get the HOA's approved operating budget total and reserve fund balance/target, org-wide (Board/PM only).",
    input_schema: EMPTY_SCHEMA,
    isAvailable: isBoardOrPm,
    execute: async (session) => getOrgFinancialSummary(session),
  },
  {
    name: "get_org_dues_status",
    description:
      "Get org-wide status of all issued dues/assessments - total collected vs. outstanding, and how many units are unpaid on each (Board/PM only).",
    input_schema: EMPTY_SCHEMA,
    isAvailable: isBoardOrPm,
    execute: async (session) => getOrgDuesStatus(session),
  },
  {
    name: "get_org_ticket_status",
    description: "Get maintenance/trouble ticket status across the whole HOA, not just one owner's units (Board/PM only).",
    input_schema: STATUS_FILTER_SCHEMA,
    isAvailable: isBoardOrPm,
    execute: async (session, args) => getOrgTicketStatus(session, args),
  },
]

export const RESPOND_TO_USER_TOOL_NAME = "respond_to_user"

export const RESPOND_TO_USER_SCHEMA: JsonSchema = {
  type: "object",
  properties: {
    answer: { type: "string", description: "The concise answer to show the user, in plain conversational language." },
    sources: {
      type: "array",
      description: "Which tool result(s) this answer is based on, for transparency.",
      items: {
        type: "object",
        properties: {
          label: { type: "string", description: 'e.g. "Your dues records" or "HOA Community Rules 2025"' },
          href: { type: "string", description: "A page path from the sitemap, if relevant" },
        },
        required: ["label"],
      },
    },
    suggestedActions: {
      type: "array",
      description: "1-3 relevant next steps - page links only, from the sitemap provided in your instructions.",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          href: { type: "string" },
        },
        required: ["label", "href"],
      },
    },
  },
  required: ["answer"],
}

export function getToolsForSession(session: AskHopeSession): AskHopeTool[] {
  return ASK_HOPE_TOOLS.filter((tool) => tool.isAvailable(session))
}

export function findTool(name: string, session: AskHopeSession): AskHopeTool | undefined {
  return getToolsForSession(session).find((tool) => tool.name === name)
}
