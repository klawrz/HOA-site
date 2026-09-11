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
import { updateAgmDetails } from "@/app/actions/agm"
import { AgmView, STATUS_LABEL } from "./types"

const d = (iso: string | null) => (iso ? iso.slice(0, 10) : "")

export function AgmDetailsDialog({ agm }: { agm: AgmView }) {
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState(agm.status)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const result = await updateAgmDetails(new FormData(e.currentTarget))
    setSaving(false)
    if (result.success) {
      toast.success("AGM details saved")
      setOpen(false)
    } else {
      setError(result.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Edit details</DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>AGM details</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input type="hidden" name="agmId" value={agm.id} />
          <input type="hidden" name="status" value={status} />
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Date</Label>
              <Input name="date" type="date" defaultValue={d(agm.date)} required />
            </div>
            <div className="space-y-1">
              <Label>Time</Label>
              <Input name="time" type="time" defaultValue={agm.date.slice(11, 16)} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={status} onValueChange={(v) => v && setStatus(v as AgmView["status"])}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(STATUS_LABEL) as AgmView["status"][]).map((s) => (
                    <SelectItem key={s} value={s}>
                      {STATUS_LABEL[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <Label>Call times</Label>
            <Input name="callTimes" defaultValue={agm.callTimes ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input name="location" defaultValue={agm.location ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Chairperson</Label>
            <Input name="chairpersonName" defaultValue={agm.chairpersonName ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Document signatories</Label>
            <Textarea
              name="signatoryNames"
              className="h-16 text-sm"
              placeholder="One name per line — these sign the convocatoria and AGM documents."
              defaultValue={agm.signatoryNames ?? ""}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Notice issued</Label>
              <Input name="noticeIssuedOn" type="date" defaultValue={d(agm.noticeIssuedOn)} />
            </div>
            <div className="space-y-1">
              <Label>Proxy deadline</Label>
              <Input name="proxyDeadline" type="date" defaultValue={d(agm.proxyDeadline)} />
            </div>
            <div className="space-y-1">
              <Label>RSVP deadline</Label>
              <Input name="rsvpDeadline" type="date" defaultValue={d(agm.rsvpDeadline)} />
            </div>
            <div className="space-y-1">
              <Label>Minutes filed</Label>
              <Input name="minutesFiledOn" type="date" defaultValue={d(agm.minutesFiledOn)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Proxy contact — name</Label>
              <Input
                name="proxyContactName"
                placeholder="Who receives scanned proxies"
                defaultValue={agm.proxyContactName ?? ""}
              />
            </div>
            <div className="space-y-1">
              <Label>Proxy contact — email</Label>
              <Input
                name="proxyContactEmail"
                type="email"
                placeholder="proxies@…"
                defaultValue={agm.proxyContactEmail ?? ""}
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Remote / Zoom details</Label>
            <Textarea
              name="zoomInfo"
              className="h-20 text-sm"
              placeholder="Zoom link, meeting ID, passcode. Note: remote attendance alone is not valid participation — an in-person proxy is still required."
              defaultValue={agm.zoomInfo ?? ""}
            />
          </div>
          <div className="space-y-1">
            <Label>Other notes</Label>
            <Textarea name="notes" className="h-16 text-sm" defaultValue={agm.notes ?? ""} />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
