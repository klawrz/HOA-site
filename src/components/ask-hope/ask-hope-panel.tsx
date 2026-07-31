"use client"

import { useState, useTransition, useRef, useEffect } from "react"
import Link from "next/link"
import { Sparkles, X, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { askHope, type ChatTurn, type AskHopeResponse } from "@/app/actions/ask-hope"
import { Role } from "@/generated/prisma"

interface DisplayMessage {
  role: "user" | "assistant"
  content: string
  sources?: { label: string; href?: string }[]
  suggestedActions?: { label: string; href: string }[]
  isError?: boolean
}

const EXAMPLE_PROMPTS: Partial<Record<Role, string[]>> = {
  OWNER: ["What do I owe in dues right now?", "What's the status of my maintenance tickets?", "What are the quiet hours?"],
  RENTER: ["What's the status of my ticket?", "How do I submit a new maintenance request?"],
  BOARD_MEMBER: ["What's our reserve fund balance?", "How much in dues is still outstanding?", "What tickets are open right now?"],
  PROPERTY_MANAGER: ["What's our reserve fund balance?", "How much in dues is still outstanding?", "What tickets are open right now?"],
}

// Matches Phase 1 scope - CONTRACTOR/UNIT_MANAGER/ACCOUNT_OWNER get a
// "coming soon" state rather than tools that don't exist yet.
const SUPPORTED_ROLES: Role[] = ["OWNER", "RENTER", "BOARD_MEMBER", "PROPERTY_MANAGER"]

export function AskHopePanel({ role, userName }: { role: Role; userName?: string | null }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<DisplayMessage[]>([])
  const [input, setInput] = useState("")
  const [pending, startTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, pending])

  const supported = SUPPORTED_ROLES.includes(role)

  function send(text: string) {
    const question = text.trim()
    if (!question || pending) return
    const nextMessages: DisplayMessage[] = [...messages, { role: "user", content: question }]
    setMessages(nextMessages)
    setInput("")

    startTransition(async () => {
      const turns: ChatTurn[] = nextMessages.map((m) => ({ role: m.role, content: m.content }))
      const result: AskHopeResponse = await askHope(turns)
      if (result.success) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: result.answer, sources: result.sources, suggestedActions: result.suggestedActions },
        ])
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: result.message, isError: true }])
      }
    })
  }

  return (
    <>
      <Button variant="ghost" size="icon" onClick={() => setOpen(true)} title="Ask HOPE">
        <Sparkles className="h-4 w-4" />
      </Button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/20" onClick={() => setOpen(false)} />
          <div className="relative w-full max-w-md bg-white h-full shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b px-4 py-3 shrink-0">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600" />
                <p className="font-semibold text-sm">Ask HOPE</p>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-700">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
              {!supported ? (
                <p className="text-sm text-gray-500">Ask HOPE isn&apos;t available for your role yet - coming soon.</p>
              ) : messages.length === 0 ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-500">Hi {userName ?? "there"}, ask me anything about your HOA.</p>
                  <div className="space-y-1.5">
                    {(EXAMPLE_PROMPTS[role] ?? []).map((p) => (
                      <button
                        key={p}
                        onClick={() => send(p)}
                        className="block w-full text-left text-sm text-blue-600 hover:underline"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                    <div
                      className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                        m.role === "user"
                          ? "bg-blue-600 text-white"
                          : m.isError
                            ? "bg-red-50 text-red-700"
                            : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.content}</p>
                      {m.sources && m.sources.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1.5">Based on: {m.sources.map((s) => s.label).join(", ")}</p>
                      )}
                      {m.suggestedActions && m.suggestedActions.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {m.suggestedActions.map((a) => (
                            <Link
                              key={a.href}
                              href={a.href}
                              onClick={() => setOpen(false)}
                              className="text-xs bg-white border rounded-full px-2 py-1 text-blue-600 hover:bg-blue-50"
                            >
                              {a.label} →
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {pending && <p className="text-xs text-gray-400">Thinking...</p>}
            </div>

            {supported && (
              <form
                onSubmit={(e) => {
                  e.preventDefault()
                  send(input)
                }}
                className="border-t p-3 flex gap-2 shrink-0"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask a question..."
                  disabled={pending}
                  className="flex-1 text-sm border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-200"
                />
                <Button type="submit" size="icon" disabled={pending || !input.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
