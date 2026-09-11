"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ExternalLink } from "lucide-react"
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
import type { AgmParticipationStatus, AgmProxyHolderType } from "@/generated/prisma"
import { PARTICIPATION_LABEL, PROXY_TYPE_LABEL } from "./types"
import type { OwnerVilla } from "./owner-agm-view"

export function OwnerRsvpDialog({ agmId, villa }: { agmId: string; villa: OwnerVilla }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")
  const [status, setStatus] = useState<AgmParticipationStatus>(
    villa.status === "NO_RESPONSE" ? "ATTENDING_IN_PERSON" : villa.status
  )
  const [proxyType, setProxyType] = useState<AgmProxyHolderType>(villa.proxyHolderType ?? "OWNER")

  const proxyHref = `/dashboard/owner/governance/agm/proxy?unit=${villa.unitId}`

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    setSaving(true)
    const fd = new FormData(e.currentTarget)
    fd.set("agmId", agmId)
    fd.set("unitId", villa.unitId)
    fd.set("status", status)
    fd.set("proxyHolderType", proxyType)
    const r = await submitAgmParticipation(fd)
    setSaving(false)
    if (r.success) {
      toast.success("Your response has been recorded")
      setOpen(false)
      router.refresh()
    } else {
      setError(r.error || "Could not save your response")
    }
  }

  const choices: AgmParticipationStatus[] = [
    "ATTENDING_IN_PERSON",
    "BY_PROXY",
    "NOT_ATTENDING",
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        {villa.status === "NO_RESPONSE" ? "Confirm attendance" : "Update response"}
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{villa.label} — how will you take part?</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid gap-1.5">
            {choices.map((s) => (
              <label
                key={s}
                className={`flex items-start gap-2 text-sm rounded-lg border p-2.5 cursor-pointer ${
                  status === s ? "border-gray-900 bg-gray-50" : "border-gray-200"
                }`}
              >
                <input
                  type="radio"
                  name="statusRadio"
                  className="mt-0.5"
                  checked={status === s}
                  onChange={() => setStatus(s)}
                />
                <span>
                  <span className="font-medium">{PARTICIPATION_LABEL[s]}</span>
                  {s === "BY_PROXY" && (
                    <span className="block text-xs text-gray-500">
                      Someone attends in person and votes on your behalf with signed proxy letters.
                    </span>
                  )}
                </span>
              </label>
            ))}
          </div>

          {status === "BY_PROXY" && (
            <div className="space-y-3 border-l-2 border-gray-200 pl-3">
              <div className="space-y-1">
                <Label>Who will represent you?</Label>
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
                <p className="text-[11px] text-gray-400">
                  Must be another owner, a family member of an owner, or a named third party. No one
                  person may hold proxies for more than 35% of the villas.
                </p>
              </div>
              <div className="space-y-1">
                <Label>Representative&apos;s full name</Label>
                <Input name="proxyHolderName" defaultValue={villa.proxyHolderName ?? ""} required />
              </div>
              <div className="space-y-1">
                <Label>Relationship / note (optional)</Label>
                <Input name="proxyHolderRelation" placeholder="e.g. son, neighbour, attorney" />
              </div>

              <a
                href={proxyHref}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Open your pre-filled proxy letters (both
                tracks)
              </a>
              <p className="text-[11px] text-gray-400 -mt-1">
                Print, fill in your representative, sign the Spanish and English sides plus the
                witness lines, then upload the scans below with a copy of the signer&apos;s passport.
              </p>

              <div className="grid gap-2">
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">
                    Signed Regime proxy {villa.proxyDocsComplete ? "(on file — replace optional)" : ""}
                  </Label>
                  <Input name="regimeFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Signed Civil Association proxy</Label>
                  <Input name="civilFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-gray-500">Passport / ID copy of the signer</Label>
                  <Input name="idFile" type="file" accept=".pdf,.jpg,.jpeg,.png" />
                </div>
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Note to the Board (optional)</Label>
            <Textarea name="notes" className="h-14 text-sm" />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save response"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
