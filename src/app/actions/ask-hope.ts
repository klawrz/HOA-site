"use server"

import Anthropic from "@anthropic-ai/sdk"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { buildSystemPrompt } from "@/lib/ask-hope-prompt"
import { getToolsForSession, findTool, RESPOND_TO_USER_TOOL_NAME, RESPOND_TO_USER_SCHEMA } from "@/lib/ask-hope-tools"

export type ChatTurn = { role: "user" | "assistant"; content: string }

type SuggestedAction = { label: string; href: string }
type SourceRef = { label: string; href?: string }

export type AskHopeResponse =
  | { success: true; answer: string; sources: SourceRef[]; suggestedActions: SuggestedAction[] }
  | {
      success: false
      error: "not_configured" | "rate_limited" | "unauthorized" | "upstream_error"
      message: string
    }

const MODEL = "claude-sonnet-5"
const MAX_TOOL_ROUNDS = 5
const REQUEST_TIMEOUT_MS = 30_000

// Deliberately in-memory, per-process - resets on server restart and
// doesn't survive multiple instances. Fine for a single local dev server;
// flagged in the plan as a real gap to fix (Redis or similar) before any
// production deployment.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000
const RATE_LIMIT_MAX_REQUESTS = 20
const requestLog = new Map<string, number[]>()

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const recent = (requestLog.get(userId) ?? []).filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (recent.length >= RATE_LIMIT_MAX_REQUESTS) {
    requestLog.set(userId, recent)
    return false
  }
  recent.push(now)
  requestLog.set(userId, recent)
  return true
}

function truncateForModel(value: unknown): string {
  const json = JSON.stringify(value)
  return json.length > 8000 ? json.slice(0, 8000) + "...(truncated)" : json
}

export async function askHope(turns: ChatTurn[]): Promise<AskHopeResponse> {
  const session = await auth()
  if (!session?.user.orgId) {
    return { success: false, error: "unauthorized", message: "Please sign in again." }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return {
      success: false,
      error: "not_configured",
      message: "Ask HOPE isn't set up yet - an administrator needs to add an Anthropic API key.",
    }
  }

  if (!checkRateLimit(session.user.id)) {
    return {
      success: false,
      error: "rate_limited",
      message: "You've sent a lot of messages in a short time - please wait a few minutes and try again.",
    }
  }

  const org = await db.organization.findUnique({ where: { id: session.user.orgId } })
  const tools = getToolsForSession(session)
  const toolDefinitions = [
    ...tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema })),
    { name: RESPOND_TO_USER_TOOL_NAME, description: "End your turn with the final answer for the user.", input_schema: RESPOND_TO_USER_SCHEMA },
  ]

  const anthropic = new Anthropic({ apiKey, timeout: REQUEST_TIMEOUT_MS })
  const systemPrompt = buildSystemPrompt(session, org?.name ?? "your HOA")

  const messages: Anthropic.MessageParam[] = turns.map((t) => ({ role: t.role, content: t.content }))

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
      const response = await anthropic.messages.create({
        model: MODEL,
        max_tokens: 2048,
        system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
        tools: toolDefinitions,
        messages,
      })

      const toolUseBlocks = response.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
      )

      if (toolUseBlocks.length === 0) {
        // Model answered in plain text without calling respond_to_user -
        // fall back to using that text directly rather than erroring out.
        const textBlock = response.content.find((block): block is Anthropic.TextBlock => block.type === "text")
        return { success: true, answer: textBlock?.text ?? "I'm not sure how to answer that.", sources: [], suggestedActions: [] }
      }

      const finalCall = toolUseBlocks.find((block) => block.name === RESPOND_TO_USER_TOOL_NAME)
      if (finalCall) {
        const input = finalCall.input as { answer?: string; sources?: SourceRef[]; suggestedActions?: SuggestedAction[] }
        return {
          success: true,
          answer: typeof input.answer === "string" ? input.answer : "I couldn't put together an answer for that.",
          sources: Array.isArray(input.sources) ? input.sources.slice(0, 5) : [],
          suggestedActions: Array.isArray(input.suggestedActions) ? input.suggestedActions.slice(0, 3) : [],
        }
      }

      // Execute every non-terminal tool call this round, feed results back.
      messages.push({ role: "assistant", content: response.content })
      const toolResults: Anthropic.ToolResultBlockParam[] = []
      for (const block of toolUseBlocks) {
        const tool = findTool(block.name, session)
        if (!tool) {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "This tool isn't available to your role.",
            is_error: true,
          })
          continue
        }
        try {
          const result = await tool.execute(session, (block.input as Record<string, unknown>) ?? {})
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: truncateForModel(result) })
        } catch {
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: "Something went wrong looking that up.",
            is_error: true,
          })
        }
      }
      messages.push({ role: "user", content: toolResults })
    }

    return {
      success: false,
      error: "upstream_error",
      message: "That question needs more back-and-forth than I can do right now - try rephrasing it more specifically.",
    }
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return { success: false, error: "rate_limited", message: "The assistant is busy right now - please try again shortly." }
      }
      return { success: false, error: "upstream_error", message: "The assistant hit a problem answering that - please try again." }
    }
    return { success: false, error: "upstream_error", message: "Something unexpected went wrong - please try again." }
  }
}
