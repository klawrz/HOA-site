"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { submitTicket } from "@/app/actions/tickets"
import { TicketPriority, TicketScope } from "@/generated/prisma"

type UnitOption = { id: string; label: string }

export function TicketRequestForm({
  units,
  allowCommonArea,
  redirectTo,
}: {
  units: UnitOption[]
  allowCommonArea: boolean
  redirectTo: string
}) {
  const router = useRouter()
  const [scope, setScope] = useState<TicketScope>(
    units.length > 0 ? "UNIT" : "COMMON_AREA"
  )
  const [unitId, setUnitId] = useState(units[0]?.id ?? "")
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (scope === "UNIT" && !unitId) {
      toast.error("Select a unit")
      return
    }
    setSubmitting(true)
    const result = await submitTicket({
      scope,
      unitId: scope === "UNIT" ? unitId : undefined,
      title,
      description,
      priority,
    })
    setSubmitting(false)
    if (result.success) {
      toast.success("Request submitted")
      router.push(redirectTo)
    } else {
      toast.error("Failed to submit request")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {allowCommonArea && (
        <div className="space-y-1">
          <Label>What does this affect?</Label>
          <Select
            value={scope}
            onValueChange={(v) => setScope(v as TicketScope)}
            items={{ UNIT: "A specific unit", COMMON_AREA: "Common property" }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {units.length > 0 && <SelectItem value="UNIT">A specific unit</SelectItem>}
              <SelectItem value="COMMON_AREA">Common property</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {scope === "UNIT" && (
        <div className="space-y-1">
          <Label>Unit</Label>
          <Select
            value={unitId}
            onValueChange={(v) => setUnitId(v ?? "")}
            items={Object.fromEntries(units.map((u) => [u.id, u.label]))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a unit" />
            </SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label>Issue Title</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Leaking faucet in bathroom"
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe the issue in detail..."
          className="h-28 resize-none"
          required
        />
      </div>
      <div className="space-y-1">
        <Label>Priority</Label>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as TicketPriority)}
          items={{ LOW: "Low", MEDIUM: "Medium", HIGH: "High", URGENT: "Urgent", EMERGENCY: "Emergency" }}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low — routine, minor inconvenience</SelectItem>
            <SelectItem value="MEDIUM">Medium — needs attention</SelectItem>
            <SelectItem value="HIGH">High — affecting daily use</SelectItem>
            <SelectItem value="URGENT">Urgent — safety or water damage</SelectItem>
            <SelectItem value="EMERGENCY">Emergency — immediate danger or major damage</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Request"}
      </Button>
    </form>
  )
}
