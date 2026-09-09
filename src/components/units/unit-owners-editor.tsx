"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Pencil, Plus, X, Check } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { addUnitCoOwner, editUnitCoOwner, removeUnitCoOwner } from "@/app/actions/unit-ownership"

type OwnerRow = { ownershipId: string; name: string | null; email: string | null }

export function UnitOwnersEditor({
  unitId,
  owners,
  heading = "Owners",
}: {
  unitId: string
  owners: OwnerRow[]
  heading?: string
}) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [addOpen, setAddOpen] = useState(owners.length === 0)
  const [addName, setAddName] = useState("")
  const [addEmail, setAddEmail] = useState("")

  async function run(fn: () => Promise<{ success: boolean; error?: string }>, after?: () => void) {
    setError("")
    setBusy(true)
    const res = await fn()
    setBusy(false)
    if (res.success) {
      after?.()
      router.refresh()
    } else {
      setError(res.error || "Something went wrong")
    }
  }

  function startEdit(o: OwnerRow) {
    setEditingId(o.ownershipId)
    setEditName(o.name ?? "")
    setEditEmail(o.email ?? "")
    setError("")
  }

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-gray-700">
        {heading}
        {owners.length > 1 && <span className="text-gray-400 font-normal"> · {owners.length} co-owners</span>}
      </p>

      <div className="divide-y rounded-lg border">
        {owners.length === 0 && (
          <p className="px-3 py-2.5 text-sm text-gray-400">No owners on record.</p>
        )}
        {owners.map((o) =>
          editingId === o.ownershipId ? (
            <div key={o.ownershipId} className="p-3 space-y-2 bg-gray-50">
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Full name"
              />
              <Input
                type="email"
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                placeholder="Email (optional)"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="outline" onClick={() => setEditingId(null)} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  disabled={busy}
                  onClick={() =>
                    run(
                      () => editUnitCoOwner(o.ownershipId, { name: editName, email: editEmail }),
                      () => setEditingId(null)
                    )
                  }
                >
                  <Check className="h-3.5 w-3.5" /> Save
                </Button>
              </div>
            </div>
          ) : (
            <div key={o.ownershipId} className="flex items-center justify-between gap-3 px-3 py-2.5">
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{o.name ?? "Unnamed owner"}</p>
                <p className="text-xs text-gray-400 truncate">{o.email ?? "No email on file"}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  size="icon-sm"
                  variant="ghost"
                  onClick={() => startEdit(o)}
                  aria-label={`Edit ${o.name ?? "owner"}`}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  className="text-gray-400 hover:text-red-600"
                  disabled={busy}
                  onClick={() => run(() => removeUnitCoOwner(o.ownershipId))}
                  aria-label={`Remove ${o.name ?? "owner"}`}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          )
        )}
      </div>

      {addOpen ? (
        <div className="space-y-2 rounded-lg border p-3">
          <Input value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Full name" />
          <Input
            type="email"
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Email (optional)"
          />
          <div className="flex justify-end gap-2">
            {owners.length > 0 && (
              <Button size="sm" variant="outline" onClick={() => setAddOpen(false)} disabled={busy}>
                Cancel
              </Button>
            )}
            <Button
              size="sm"
              disabled={busy || (!addName.trim() && !addEmail.trim())}
              onClick={() =>
                run(
                  () => addUnitCoOwner(unitId, { name: addName, email: addEmail }),
                  () => {
                    setAddName("")
                    setAddEmail("")
                    setAddOpen(false)
                  }
                )
              }
            >
              <Plus className="h-3.5 w-3.5" /> Add owner
            </Button>
          </div>
        </div>
      ) : (
        <Button size="sm" variant="outline" onClick={() => setAddOpen(true)}>
          <Plus className="h-3.5 w-3.5" /> Add co-owner
        </Button>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-gray-400">
        Owner of record. Portal access is separate — send an invite from Send Invites.
      </p>
    </div>
  )
}
