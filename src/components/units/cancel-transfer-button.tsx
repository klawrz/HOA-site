"use client"

import { useState } from "react"
import { toast } from "sonner"
import { X } from "lucide-react"
import { cancelOwnershipTransferRequest } from "@/app/actions/unit-ownership"

export function CancelTransferButton({ requestId }: { requestId: string }) {
  const [pending, setPending] = useState(false)

  async function handleClick() {
    if (!confirm("Cancel this pending transfer? The invite already sent will no longer work.")) return
    setPending(true)
    const result = await cancelOwnershipTransferRequest(requestId)
    setPending(false)
    if (result.success) {
      toast.success("Transfer cancelled")
    } else {
      toast.error(result.error || "Failed to cancel transfer")
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={pending}
      className="flex items-center gap-1 text-amber-700 hover:text-amber-900 font-medium shrink-0 transition-colors"
    >
      <X className="h-3 w-3" /> Cancel
    </button>
  )
}
