"use client"

import { useState } from "react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { approvePMContract } from "@/app/actions/pm"
import { formatDateISO } from "@/lib/utils"

interface MeetingOption {
  id: string
  title: string
  date: Date
}

export function ApprovePMContractDialog({ contractId, meetings }: { contractId: string; meetings: MeetingOption[] }) {
  const [open, setOpen] = useState(false)
  const [meetingId, setMeetingId] = useState("")
  const [saving, setSaving] = useState(false)

  const meetingItems: Record<string, string> = { "": "No specific meeting" }
  for (const m of meetings) meetingItems[m.id] = `${m.title} (${formatDateISO(m.date)})`

  async function handleApprove() {
    setSaving(true)
    const result = await approvePMContract(contractId, meetingId || undefined)
    setSaving(false)
    if (result.success) {
      toast.success("Property manager contract approved")
      setOpen(false)
    } else {
      toast.error("Failed to approve")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Approve</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve Property Manager Contract</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Marks this contract as the association&apos;s active, Board-approved Property Manager. Owners
            will see this company as their contracted PM.
          </p>
          {meetings.length > 0 && (
            <div className="space-y-1">
              <label className="text-sm font-medium">Approved at meeting (optional)</label>
              <Select value={meetingId} onValueChange={(v) => setMeetingId(v ?? "")} items={meetingItems}>
                <SelectTrigger>
                  <SelectValue placeholder="No specific meeting" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No specific meeting</SelectItem>
                  {meetings.map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {meetingItems[m.id]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={handleApprove} disabled={saving}>
              {saving ? "Approving..." : "Approve"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
