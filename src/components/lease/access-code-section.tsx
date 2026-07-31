"use client"

import { useState } from "react"
import { toast } from "sonner"
import { KeyRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { setAccessCode } from "@/app/actions/lease"

export function AccessCodeSection({
  unitId,
  code,
  notes,
  canManage,
}: {
  unitId: string
  code: string | null
  notes: string | null
  canManage: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await setAccessCode(
      unitId,
      (form.get("code") as string) ?? "",
      (form.get("notes") as string) ?? ""
    )
    setSaving(false)
    if (result.success) {
      toast.success("Access code updated")
      setEditing(false)
    } else {
      toast.error("Failed to update access code")
    }
  }

  if (editing) {
    return (
      <form onSubmit={handleSubmit} className="border rounded-lg p-3 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <KeyRound className="h-3.5 w-3.5 text-gray-400" /> Access Code
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Code</Label>
            <Input key={code} name="code" defaultValue={code ?? undefined} placeholder="e.g. 4521#" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Notes</Label>
            <Input key={notes} name="notes" defaultValue={notes ?? undefined} placeholder="e.g. front gate, changes quarterly" />
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" type="button" onClick={() => setEditing(false)}>Cancel</Button>
          <Button size="sm" type="submit" disabled={saving}>{saving ? "Saving..." : "Save"}</Button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex items-center justify-between border rounded-lg p-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-3.5 w-3.5 text-gray-400" />
        <div>
          <p className="text-sm font-medium">
            {code || <span className="text-gray-400 font-normal">No access code on file</span>}
          </p>
          {notes && <p className="text-xs text-gray-400">{notes}</p>}
        </div>
      </div>
      {canManage && (
        <Button size="sm" variant="outline" onClick={() => setEditing(true)}>Edit</Button>
      )}
    </div>
  )
}
