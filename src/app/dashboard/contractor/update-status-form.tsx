"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateTicketStatus } from "@/app/actions/tickets"
import { TicketStatus } from "@/generated/prisma"

export function UpdateTicketStatusForm({
  ticketId,
  currentStatus,
}: {
  ticketId: string
  currentStatus: TicketStatus
}) {
  const [status, setStatus] = useState<TicketStatus>(currentStatus)
  const [saving, setSaving] = useState(false)

  async function handleUpdate() {
    setSaving(true)
    const result = await updateTicketStatus(ticketId, status)
    setSaving(false)
    if (result.success) {
      toast.success("Status updated")
    } else {
      toast.error("Failed to update status")
    }
  }

  return (
    <div className="flex flex-col gap-2 w-36 shrink-0">
      <Select value={status} onValueChange={(v) => setStatus(v as TicketStatus)}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
          <SelectItem value="RESOLVED">Resolved</SelectItem>
          <SelectItem value="CLOSED">Closed</SelectItem>
        </SelectContent>
      </Select>
      <Button
        size="sm"
        variant="outline"
        onClick={handleUpdate}
        disabled={saving || status === currentStatus}
        className="h-7 text-xs"
      >
        {saving ? "Updating..." : "Update"}
      </Button>
    </div>
  )
}
