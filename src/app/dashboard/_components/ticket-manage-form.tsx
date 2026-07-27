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
import { assignTicket, updateTicketPriority } from "@/app/actions/tickets"
import { TicketPriority } from "@/generated/prisma"

interface Contractor {
  id: string
  name: string | null
  email: string
  company: string | null
}

export function TicketManageForm({
  ticketId,
  contractors,
  currentContractorId,
  currentPriority,
}: {
  ticketId: string
  contractors: Contractor[]
  currentContractorId?: string
  currentPriority: TicketPriority
}) {
  const [contractorId, setContractorId] = useState(currentContractorId ?? "")
  const [priority, setPriority] = useState<TicketPriority>(currentPriority)
  const [assigning, setAssigning] = useState(false)

  async function handleAssign() {
    if (!contractorId) return
    setAssigning(true)
    const result = await assignTicket(ticketId, contractorId)
    setAssigning(false)
    if (result.success) {
      toast.success("Contractor assigned")
    } else {
      toast.error("Failed to assign")
    }
  }

  async function handlePriorityChange(v: string | null) {
    if (!v) return
    const next = v as TicketPriority
    setPriority(next)
    const result = await updateTicketPriority(ticketId, next)
    if (result.success) {
      toast.success("Priority updated")
    } else {
      toast.error("Failed to update priority")
      setPriority(currentPriority)
    }
  }

  return (
    <div className="flex flex-col gap-2 sm:w-52 shrink-0">
      <Select
        value={priority}
        onValueChange={handlePriorityChange}
        items={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent", EMERGENCY: "Emergency" }}
      >
        <SelectTrigger className="h-8 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="LOW">Low</SelectItem>
          <SelectItem value="MEDIUM">Medium</SelectItem>
          <SelectItem value="HIGH">High</SelectItem>
          <SelectItem value="URGENT">Urgent</SelectItem>
          <SelectItem value="EMERGENCY">Emergency</SelectItem>
        </SelectContent>
      </Select>
      <Select
        value={contractorId}
        onValueChange={(v) => setContractorId(v ?? "")}
        items={Object.fromEntries(
          contractors.map((c) => [c.id, `${c.name ?? c.email}${c.company ? ` (${c.company})` : ""}`])
        )}
      >
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
        disabled={assigning || !contractorId}
        className="h-7 text-xs"
      >
        {assigning ? "Assigning..." : "Assign"}
      </Button>
    </div>
  )
}
