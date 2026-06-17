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
import { assignTicket } from "@/app/actions/tickets"

interface Contractor {
  id: string
  name: string | null
  email: string
  company: string | null
}

export function AssignTicketForm({
  ticketId,
  contractors,
  currentContractorId,
}: {
  ticketId: string
  contractors: Contractor[]
  currentContractorId?: string
}) {
  const [contractorId, setContractorId] = useState(currentContractorId ?? "")
  const [saving, setSaving] = useState(false)

  async function handleAssign() {
    if (!contractorId) return
    setSaving(true)
    const result = await assignTicket(ticketId, contractorId)
    setSaving(false)
    if (result.success) {
      toast.success("Contractor assigned")
    } else {
      toast.error("Failed to assign")
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:w-52 shrink-0">
      <Select value={contractorId} onValueChange={(v) => setContractorId(v ?? "")}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Assign contractor" />
        </SelectTrigger>
        <SelectContent>
          {contractors.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name ?? c.email}
              {c.company && ` (${c.company})`}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button
        size="sm"
        onClick={handleAssign}
        disabled={saving || !contractorId}
        className="h-7 text-xs"
      >
        {saving ? "Assigning..." : "Assign"}
      </Button>
    </div>
  )
}
