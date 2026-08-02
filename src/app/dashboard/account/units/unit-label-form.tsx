"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Tag, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { updateUnitLabel } from "@/app/actions/org"

export function UnitLabelForm({ unitLabel }: { unitLabel: string }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [value, setValue] = useState(unitLabel)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateUnitLabel(value)
      setEditing(false)
      toast.success("Unit label saved")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save")
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="text-xs text-gray-500 hover:text-gray-900 flex items-center gap-1"
      >
        <Tag className="h-3 w-3" /> Called &quot;{unitLabel}&quot; here <Pencil className="h-3 w-3" />
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-7 w-32 text-sm"
        placeholder="Unit"
      />
      <Button type="submit" size="xs" disabled={saving || !value.trim()}>
        {saving ? "Saving..." : "Save"}
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={() => { setEditing(false); setValue(unitLabel) }}>
        Cancel
      </Button>
    </form>
  )
}
