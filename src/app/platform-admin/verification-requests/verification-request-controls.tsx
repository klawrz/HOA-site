"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { approveOrgVerification, denyOrgVerification } from "@/app/actions/org-verification"

export function VerificationRequestControls({ requestId }: { requestId: string }) {
  const router = useRouter()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function approve() {
    setPending(true)
    setError("")
    try {
      await approveOrgVerification(requestId)
      toast.success("Organization verified")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve")
    } finally {
      setPending(false)
    }
  }

  async function deny() {
    const reason = window.prompt("Reason for denial (optional):") ?? undefined
    setPending(true)
    setError("")
    try {
      await denyOrgVerification(requestId, reason)
      toast.success("Request denied")
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to deny")
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-1">
      <div className="flex gap-3">
        <button onClick={approve} disabled={pending} className="text-xs text-green-700 hover:underline disabled:opacity-50">
          Approve
        </button>
        <button onClick={deny} disabled={pending} className="text-xs text-red-600 hover:underline disabled:opacity-50">
          Deny
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  )
}
