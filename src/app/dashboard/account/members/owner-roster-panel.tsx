"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Copy, CheckCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { upsertPendingOwner, removePendingOwner, sendPendingOwnerInvite, sendAllPendingOwners } from "@/app/actions/pending-owners"
import { ImportDocumentsPanel } from "@/app/onboarding/import-documents-panel"
import { unitDisplayName } from "@/lib/unit-label-format"

type Unit = { id: string; number: string }
type PendingOwnerRow = { id: string; unitId: string; unitNumber: string; name: string | null; email: string | null }
type Invite = { id: string; email: string; token: string; acceptedAt: Date | null }

// Same staged-roster-then-send pattern as the onboarding wizard's Owners
// step (see PendingOwner in schema.prisma) - surfaced here too since the
// sidebar's "Setup Owners" link points at this page, not at the wizard,
// and setup can now happen in any order well after the wizard is done.
export function OwnerRosterPanel({
  units,
  unitLabel,
  pendingOwners,
  ownerInvites,
  baseUrl,
}: {
  units: Unit[]
  unitLabel: string
  pendingOwners: PendingOwnerRow[]
  ownerInvites: Invite[]
  baseUrl: string
}) {
  const router = useRouter()
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerUnitId, setOwnerUnitId] = useState("")
  const [ownerError, setOwnerError] = useState("")
  const [sendingAll, setSendingAll] = useState(false)
  const [sendingId, setSendingId] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  function copyLink(token: string) {
    navigator.clipboard.writeText(`${baseUrl}/invite/${token}`)
    setCopiedToken(token)
    setTimeout(() => setCopiedToken(null), 2000)
  }

  async function handleAddOwner(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setOwnerError("")
    if (!ownerUnitId) {
      setOwnerError("Select a unit")
      return
    }
    try {
      await upsertPendingOwner(ownerUnitId, { email: ownerEmail })
      setOwnerEmail("")
      setOwnerUnitId("")
      router.refresh()
    } catch (err) {
      setOwnerError(err instanceof Error ? err.message : "Failed to add owner")
    }
  }

  async function handleSend(id: string) {
    setSendingId(id)
    const result = await sendPendingOwnerInvite(id)
    setSendingId(null)
    if (result.success && result.token) {
      copyLink(result.token)
    } else if (!result.success) {
      setOwnerError(result.error ?? "Failed to send invite")
    }
    router.refresh()
  }

  async function handleRemove(id: string) {
    await removePendingOwner(id)
    router.refresh()
  }

  async function handleSendAll() {
    setSendingAll(true)
    await sendAllPendingOwners()
    setSendingAll(false)
    router.refresh()
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-gray-700">Owner Roster</h2>
        <p className="text-sm text-gray-500">Add each unit&apos;s owner - generate an invite link, or import from a document.</p>
      </div>

      <ImportDocumentsPanel mode="invites" />

      <form onSubmit={handleAddOwner} className="bg-white border rounded-xl p-5 space-y-4">
        <div className="space-y-1">
          <Label>Assign to {unitLabel || "unit"}</Label>
          <Select value={ownerUnitId} onValueChange={(v) => setOwnerUnitId(v ?? "")}>
            <SelectTrigger><SelectValue placeholder={`Select ${(unitLabel || "unit").toLowerCase()}`} /></SelectTrigger>
            <SelectContent>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>{unitDisplayName(unitLabel, u.number)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Email address (optional for now)</Label>
          <Input
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            type="email"
            placeholder="owner@example.com"
          />
        </div>
        {ownerError && <p className="text-sm text-red-600">{ownerError}</p>}
        <Button type="submit" className="w-full gap-2" disabled={!ownerUnitId}>
          <Plus className="h-4 w-4" /> Add to Owner Roster
        </Button>
      </form>

      {pendingOwners.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-700">Owners on file ({pendingOwners.length})</h3>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSendAll}
              disabled={sendingAll || !pendingOwners.some((o) => o.email)}
            >
              {sendingAll ? "Sending..." : "Send All Invites"}
            </Button>
          </div>
          <div className="bg-white border rounded-xl divide-y">
            {pendingOwners.map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">
                    {unitDisplayName(unitLabel, o.unitNumber)}{o.name ? ` - ${o.name}` : ""}
                  </p>
                  <p className="text-xs text-gray-500 truncate">{o.email || "No email on file yet"}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <button
                    onClick={() => handleSend(o.id)}
                    disabled={!o.email || sendingId === o.id}
                    className="text-xs text-purple-600 hover:text-purple-800 disabled:text-gray-300 transition-colors"
                  >
                    {sendingId === o.id ? "Sending..." : "Send Invite"}
                  </button>
                  <button onClick={() => handleRemove(o.id)} className="text-gray-400 hover:text-red-600 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400">
            Owners are staged here until you send their invite - add everyone now and send whenever you&apos;re ready.
          </p>
        </div>
      )}

      {ownerInvites.length > 0 && (
        <div className="space-y-1.5">
          <h3 className="text-sm font-medium text-gray-700">Sent invites</h3>
          <div className="bg-white border rounded-xl divide-y">
            {ownerInvites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between px-4 py-3 gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{inv.email}</p>
                  <p className="text-xs text-gray-500">{inv.acceptedAt ? "Accepted" : "Pending"}</p>
                </div>
                {!inv.acceptedAt && (
                  <button
                    onClick={() => copyLink(inv.token)}
                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-900 shrink-0 transition-colors"
                  >
                    {copiedToken === inv.token ? (
                      <><CheckCheck className="h-3.5 w-3.5 text-green-600" /> Copied</>
                    ) : (
                      <><Copy className="h-3.5 w-3.5" /> Copy Link</>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
