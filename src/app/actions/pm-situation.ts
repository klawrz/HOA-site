"use server"

import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/auth"
import { canPreviewRole } from "@/lib/role-access"
import { getPMSituationData, describePMSituation, type PMSituationData } from "@/lib/pm-situation"

// PROTOTYPE - the first "agentic surface" in HOPE beyond Ask HOPE's Q&A.
// Reads the structured PM state (src/lib/pm-situation.ts), asks Claude to
// compose a short situation read + a few next-step links, and returns it
// for the panel to render. Read-only: the suggested actions are navigation
// links from a fixed allow-list, no write tools yet. Uses the same model /
// key / rate-limit shape as src/app/actions/ask-hope.ts.

const MODEL = "claude-sonnet-5"
const REQUEST_TIMEOUT_MS = 20_000
const CACHE_TTL_MS = 10 * 60 * 1000

export type PMSituationSeverity = "ok" | "attention" | "urgent"
type Action = { label: string; href: string }

export type PMSituationResult =
  | {
      ok: true
      configured: boolean // false = no API key; summary is the deterministic fallback
      severity: PMSituationSeverity
      summary: string
      actions: Action[]
      data: PMSituationData
      generatedAt: string
    }
  | { ok: false; error: string }

// href -> human label. The model may only pick from these; anything else
// it returns is dropped.
const ALLOWED_ACTIONS: Record<string, string> = {
  "/dashboard/board/pm": "Review the PM contract",
  "/dashboard/board/tickets": "View open tickets",
  "/dashboard/board/contracts": "Review property contracts",
  "/dashboard/board/finances/banking": "Check banking & insurance",
  "/dashboard/board/meetings": "Schedule a Board meeting",
  "/dashboard/board/contractors": "Open the contractor directory",
}

const cache = new Map<string, { at: number; result: Extract<PMSituationResult, { ok: true }> }>()

function fallbackSeverity(d: PMSituationData): PMSituationSeverity {
  if (
    !d.activePM ||
    (d.activePM.daysUntilEnd != null && d.activePM.daysUntilEnd < 0) ||
    d.urgentTickets > 0 ||
    d.insurance?.status === "EXPIRED" ||
    !d.insurance
  )
    return "urgent"
  if (
    (d.activePM.daysUntilEnd != null && d.activePM.daysUntilEnd <= 60) ||
    !d.activePM.approved ||
    d.openTickets > 0 ||
    d.insurance?.status === "EXPIRING_SOON" ||
    d.propertyContracts.expiringOrExpired > 0
  )
    return "attention"
  return "ok"
}

function fallbackActions(d: PMSituationData): Action[] {
  const out: Action[] = []
  if (!d.activePM || (d.activePM.daysUntilEnd != null && d.activePM.daysUntilEnd <= 60) || !d.activePM.approved || d.pendingPM)
    out.push({ label: ALLOWED_ACTIONS["/dashboard/board/pm"], href: "/dashboard/board/pm" })
  if (d.openTickets > 0) out.push({ label: ALLOWED_ACTIONS["/dashboard/board/tickets"], href: "/dashboard/board/tickets" })
  if (!d.insurance || d.insurance.status !== "CURRENT")
    out.push({ label: ALLOWED_ACTIONS["/dashboard/board/finances/banking"], href: "/dashboard/board/finances/banking" })
  if (d.propertyContracts.expiringOrExpired > 0)
    out.push({ label: ALLOWED_ACTIONS["/dashboard/board/contracts"], href: "/dashboard/board/contracts" })
  return out.slice(0, 3)
}

const PROVIDE_TOOL = {
  name: "provide_situation",
  description: "Return the property-management situation read for the Board.",
  input_schema: {
    type: "object" as const,
    properties: {
      severity: { type: "string", enum: ["ok", "attention", "urgent"], description: "urgent = something is lapsed or unmanaged; attention = a deadline or gap is approaching; ok = nothing pressing." },
      summary: { type: "string", description: "2-4 plain sentences. Lead with what matters most. Name specifics (companies, days, ticket titles). No preamble, no markdown." },
      actions: {
        type: "array",
        description: "0-3 next steps, most useful first. Each href MUST be one of the allowed paths given in the instructions.",
        items: {
          type: "object",
          properties: { label: { type: "string" }, href: { type: "string" } },
          required: ["label", "href"],
        },
      },
    },
    required: ["severity", "summary", "actions"],
  },
}

export async function getPMSituation(): Promise<PMSituationResult> {
  const session = await auth()
  if (!session?.user.orgId || !canPreviewRole(session.user.role, "BOARD_MEMBER")) {
    return { ok: false, error: "Not authorized." }
  }
  const orgId = session.user.orgId

  const cached = cache.get(orgId)
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.result

  const data = await getPMSituationData(orgId)
  const baseline = describePMSituation(data)
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    const result = {
      ok: true as const,
      configured: false,
      severity: fallbackSeverity(data),
      summary: baseline,
      actions: fallbackActions(data),
      data,
      generatedAt: new Date().toISOString(),
    }
    cache.set(orgId, { at: Date.now(), result })
    return result
  }

  const allowed = Object.entries(ALLOWED_ACTIONS)
    .map(([href, label]) => `  ${href} - ${label}`)
    .join("\n")

  const system = `You brief the Board of ${data.orgName} on property management. Given the current state as JSON, write a short situation read a Board member can act on.

Rules:
- 2-4 sentences, plain and specific. Lead with the most important thing. Name companies, day counts, and ticket titles from the data. No greeting, no markdown, no bullet points.
- Pick 0-3 next steps, each an href from this list ONLY:
${allowed}
- severity: "urgent" if a contract/coverage has lapsed or there is no PM; "attention" if a renewal, approval, or coverage deadline is near or tickets are open; otherwise "ok".
- Do not invent facts not in the data.

A plain-language description of the same data, for reference: ${baseline}`

  try {
    const anthropic = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS })
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      tools: [PROVIDE_TOOL],
      tool_choice: { type: "tool", name: "provide_situation" },
      messages: [{ role: "user", content: `Current state:\n${JSON.stringify(data)}` }],
    })

    const call = response.content.find(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use" && b.name === "provide_situation"
    )
    const input = (call?.input ?? {}) as { severity?: string; summary?: string; actions?: Action[] }

    const severity: PMSituationSeverity =
      input.severity === "ok" || input.severity === "attention" || input.severity === "urgent"
        ? input.severity
        : fallbackSeverity(data)
    const actions = (Array.isArray(input.actions) ? input.actions : [])
      .filter((a) => a && typeof a.href === "string" && ALLOWED_ACTIONS[a.href])
      .map((a) => ({ href: a.href, label: (a.label || ALLOWED_ACTIONS[a.href]).slice(0, 60) }))
      .slice(0, 3)

    const result = {
      ok: true as const,
      configured: true,
      severity,
      summary: typeof input.summary === "string" && input.summary.trim() ? input.summary.trim() : baseline,
      actions: actions.length ? actions : fallbackActions(data),
      data,
      generatedAt: new Date().toISOString(),
    }
    cache.set(orgId, { at: Date.now(), result })
    return result
  } catch (err) {
    console.error("[pm-situation] Claude call failed:", err instanceof Error ? err.message : err)
    // Any upstream problem -> the deterministic version, still useful.
    const result = {
      ok: true as const,
      configured: false,
      severity: fallbackSeverity(data),
      summary: baseline,
      actions: fallbackActions(data),
      data,
      generatedAt: new Date().toISOString(),
    }
    return result
  }
}
