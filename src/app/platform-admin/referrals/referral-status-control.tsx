"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { markPMReferralStatus } from "@/app/actions/pm-referrals"

const OPTIONS = [
  { value: "CONTACTED", label: "Mark Contacted" },
  { value: "DECLINED", label: "Mark Declined" },
] as const

export function ReferralStatusControl({ referralId, status }: { referralId: string; status: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  async function setStatus(next: "CONTACTED" | "DECLINED") {
    setPending(true)
    try {
      await markPMReferralStatus(referralId, next)
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setPending(false)
    }
  }

  if (status === "CONVERTED" || status === "DECLINED") return null

  return (
    <div className="flex gap-2">
      {OPTIONS.filter((o) => o.value !== status).map((o) => (
        <button
          key={o.value}
          onClick={() => setStatus(o.value)}
          disabled={pending}
          className="text-xs text-blue-600 hover:underline disabled:opacity-50"
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
