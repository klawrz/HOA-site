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
import { approveBudget } from "@/app/actions/budgets"
import { formatDateISO } from "@/lib/utils"

interface MeetingOption {
  id: string
  title: string
  date: Date
}

export function ApproveBudgetDialog({ budgetId, meetings }: { budgetId: string; meetings: MeetingOption[] }) {
  const [open, setOpen] = useState(false)
  const [meetingId, setMeetingId] = useState("")
  const [saving, setSaving] = useState(false)

  const meetingItems: Record<string, string> = { "": "No specific meeting" }
  for (const m of meetings) meetingItems[m.id] = `${m.title} (${formatDateISO(m.date)})`

  async function handleApprove() {
    setSaving(true)
    const result = await approveBudget(budgetId, meetingId || undefined)
    setSaving(false)
    if (result.success) {
      toast.success("Budget approved")
      setOpen(false)
    } else {
      toast.error("Failed to approve")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>Approve Budget</DialogTrigger>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve Budget</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Marks this version as the approved budget for the year. Owners will see it, including any
            previous-year comparison.
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
