import type { AskHopeSession } from "@/lib/ask-hope-queries"
import type { AskHopeTool } from "@/lib/ask-hope-tools"

// A specialist capability behind the ASK HOPE orchestrator (see the
// Agentic Intelligence brief). A skill bundles: the domain knowledge ASK
// HOPE needs in its system prompt for that area, the tools it can call,
// and - optionally - a proactive "situation read" a page can render
// without the user asking anything.
//
// SERVER ONLY. Skill modules may import server SDKs (Prisma, Anthropic) -
// never import this registry from a "use client" component.

export type SituationSeverity = "ok" | "attention" | "urgent"

export interface SituationAction {
  label: string
  href: string
}

export interface SituationRead {
  ok: true
  configured: boolean // false = composed via rules only (no key / upstream error)
  severity: SituationSeverity
  summary: string
  actions: SituationAction[]
  generatedAt: string
  // Domain-specific structured data behind the read, for the panel and for debugging.
  data: unknown
}

export interface Skill {
  id: "governance" | "finance" | "property" | "owner-support"
  label: string
  // Whether this domain is relevant to the signed-in user's role at all.
  // Fine-grained per-tool gating still lives on each tool's isAvailable.
  appliesTo: (session: AskHopeSession) => boolean
  // Appended to the ASK HOPE system prompt when the skill applies.
  systemFragment: string
  // Tools this skill contributes. Each keeps its own isAvailable check;
  // a tool may be listed by more than one skill (deduped by name).
  tools: AskHopeTool[]
  // Proactive read for a page panel. Present so far only on `property`.
  getSituation?: (session: AskHopeSession) => Promise<SituationRead>
}
