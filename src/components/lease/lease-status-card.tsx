"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { InviteRenterDialog } from "./invite-renter-dialog"
import { endLease } from "@/app/actions/lease"
import { formatDateISO } from "@/lib/utils"

interface CurrentLease {
  id: string
  renterName: string | null
  renterEmail: string
  monthlyRent: number | null
  startDate: Date
  endDate: Date | null
}

export function LeaseStatusCard({ unitId, lease }: { unitId: string; lease: CurrentLease | null }) {
  const [ending, setEnding] = useState(false)

  async function handleEnd() {
    setEnding(true)
    const result = await endLease(lease!.id)
    setEnding(false)
    if (!result.success) toast.error("Failed to end lease")
  }

  if (!lease) {
    return (
      <div className="flex items-center justify-between border rounded-lg p-4">
        <div>
          <p className="text-sm font-medium">No active renter</p>
          <p className="text-xs text-gray-400">Arrange a rental to invite someone in with lease terms on file.</p>
        </div>
        <InviteRenterDialog unitId={unitId} />
      </div>
    )
  }

  return (
    <div className="border rounded-lg p-4 space-y-2">
      <p className="text-sm font-medium">Current Renter</p>
      <div className="flex items-center justify-between">
        <div className="text-sm">
          <p className="font-medium">{lease.renterName ?? lease.renterEmail}</p>
          <p className="text-xs text-gray-500">{lease.renterEmail}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {lease.monthlyRent != null && `$${lease.monthlyRent.toLocaleString()}/mo · `}
            Since {formatDateISO(lease.startDate)}
            {lease.endDate && ` · Until ${formatDateISO(lease.endDate)}`}
          </p>
        </div>
        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700" onClick={handleEnd} disabled={ending}>
          {ending ? "Ending..." : "End Lease"}
        </Button>
      </div>
    </div>
  )
}
