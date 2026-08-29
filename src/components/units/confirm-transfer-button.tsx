"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { confirmOwnershipTransferAsSeller } from "@/app/actions/unit-ownership"

export function ConfirmTransferButton({ requestId }: { requestId: string }) {
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)

  async function handleClick() {
    if (
      !confirm(
        "Confirm you're divesting this unit? This can't be undone from your side - the transfer completes once every other required party has also confirmed."
      )
    )
      return
    setPending(true)
    const result = await confirmOwnershipTransferAsSeller(requestId)
    setPending(false)
    if (result.success) {
      setDone(true)
      toast.success("Confirmed")
    } else {
      toast.error(result.error || "Failed to confirm")
    }
  }

  if (done) return <span className="text-xs font-medium text-green-700">Confirmed ✓</span>

  return (
    <Button size="sm" variant="outline" onClick={handleClick} disabled={pending}>
      {pending ? "Confirming..." : "Confirm Transfer"}
    </Button>
  )
}
