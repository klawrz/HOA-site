"use client"

import { useState } from "react"
import Link from "next/link"
import { X, Landmark } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// A Board Member's Membership grants full governance authority the instant
// they accept an invite - approving PM contracts, budgets, posting
// announcements - but they don't show up on the Board roster
// (BoardRosterCard, driven by BoardPosition) until someone separately adds
// a seat for them. Authority arrives before visibility, the opposite of
// most "blocked" states in this app. Rather than a schema change to force
// a seat at invite time (considered and declined as unnecessary complexity
// - see board-positions.ts), this nudges them toward the self-serve
// createBoardPosition flow Board Members already have access to.
export function BoardRosterPrompt({ href }: { href: string }) {
  const [dismissed, setDismissed] = useState(false)
  if (dismissed) return null

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardContent className="py-3 px-4 flex items-center gap-3">
        <Landmark className="h-4 w-4 text-blue-600 shrink-0" />
        <p className="text-sm text-blue-900 flex-1">
          You&apos;re not listed on the Board roster yet.{" "}
          <Link href={href} className="underline hover:text-blue-700">
            Add yourself
          </Link>{" "}
          so other members can see your seat.
        </p>
        <button
          onClick={() => setDismissed(true)}
          className="text-blue-400 hover:text-blue-600 transition-colors shrink-0"
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  )
}
