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
import { TicketPriority } from "@/generated/prisma"

export function NewTicketForm({
  unitId,
  unitNumber,
}: {
  unitId: string
  unitNumber: string
}) {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [priority, setPriority] = useState<TicketPriority>("MEDIUM")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const result = await submitTicket({ unitId, title, description, priority })
    setSubmitting(false)
    if (result.success) {
      toast.success("Ticket submitted successfully")
      router.push("/dashboard/renter/tickets")
    } else {
      toast.error("Failed to submit ticket")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="text-sm text-gray-500 bg-gray-50 rounded px-3 py-2">
        Unit: <span className="font-semibold text-gray-800">{unitNumber}</span>
      </div>
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
        <Select value={priority} onValueChange={(v) => setPriority(v as TicketPriority)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="LOW">Low — minor inconvenience</SelectItem>
            <SelectItem value="MEDIUM">Medium — needs attention</SelectItem>
            <SelectItem value="HIGH">High — affecting daily use</SelectItem>
            <SelectItem value="URGENT">Urgent — safety or water damage</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" className="w-full" disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Ticket"}
      </Button>
    </form>
  )
}
