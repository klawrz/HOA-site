"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
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
import { submitAgmParticipation } from "@/app/actions/agm"
import type { AgmTally } from "@/lib/agm-shared"
import { PARTICIPATION_LABEL, PROXY_TYPE_LABEL } from "./types"
import type { AgmParticipationStatus, AgmProxyHolderType } from "@/generated/prisma"

export function RecordResponseDialog({
  agmId,
  rows,
  ownerByUnit,
}: {
  agmId: string
  rows: AgmTally["rows"]
  ownerByUnit: Record<string, string>
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [unitId, setUnitId] = useState(rows[0]?.unitId ?? "")
  const [status, setStatus] = useState<AgmParticipationStatus>("ATTENDING_IN_PERSON")
  const [proxyType, setProxyType] = useState<AgmProxyHolderType>("OWNER")

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    fd.set("agmId", agmId)
    fd.set("unitId", unitId)
    fd.set("status", status)
    fd.set("proxyHolderType", proxyType)
    const r = await submitAgmParticipation(fd)
    setSaving(false)
    if (r.success) {
      toast.success("Response recorded")
      setOpen(false)
      router.refresh()
    } else {
      setError(r.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" variant="outline" />}>Record a response</DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Record a villa&apos;s response</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Villa</Label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full border rounded-md px-2 py-1.5 text-sm"
            >
              {rows.map((r) => (
                <option key={r.unitId} value={r.unitId}>
                  {r.label} — {ownerByUnit[r.unitId] ?? "Owner"}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1">
            <Label>Participation</Label>
            <div className="grid grid-cols-1 gap-1.5">
              {(
                ["ATTENDING_IN_PERSON", "BY_PROXY", "NOT_ATTENDING", "NO_RESPONSE"] as AgmParticipationStatus[]
              ).map((s) => (
                <label key={s} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="statusRadio"
                    checked={status === s}
                    onChange={() => setStatus(s)}
                  />
                  {PARTICIPATION_LABEL[s]}
                </label>
              ))}
            </div>
          </div>

          {status === "BY_PROXY" && (
            <div className="space-y-3 border-l-2 border-gray-200 pl-3">
              <div className="space-y-1">
                <Label>Representative type</Label>
                <div className="flex flex-wrap gap-2">
                  {(["OWNER", "FAMILY", "THIRD_PARTY"] as AgmProxyHolderType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setProxyType(t)}
                      className={`text-xs rounded-full px-3 py-1 border ${
                        proxyType === t
                          ? "bg-gray-900 text-white border-gray-900"
                          : "bg-white text-gray-600 border-gray-300"
                      }`}
                    >
                      {PROXY_TYPE_LABEL[t]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1">
                <Label>Representative full name</Label>
                <Input name="proxyHolderName" required />
              </div>
              <div className="space-y-1">
                <Label>Relationship / note (optional)</Label>
                <Input name="proxyHolderRelation" placeholder="e.g. daughter, attorney" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Signed Regime proxy (optional)</Label>
                  <Input name="regimeFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Signed Civil Association proxy (optional)</Label>
                  <Input name="civilFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Passport / ID copy (optional)</Label>
                  <Input name="idFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Notes (optional)</Label>
            <Textarea name="notes" className="h-14 text-sm" />
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
