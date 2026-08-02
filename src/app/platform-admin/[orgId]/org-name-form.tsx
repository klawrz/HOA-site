"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { updateOrgName } from "@/app/actions/platform-admin"

export function OrgNameForm({ orgId, initialName }: { orgId: string; initialName: string }) {
  const [name, setName] = useState(initialName)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateOrgName(orgId, name)
      toast.success("Organization name updated")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2">
      <Input value={name} onChange={(e) => setName(e.target.value)} className="max-w-xs" />
      <Button type="submit" size="sm" disabled={saving || name.trim() === initialName || !name.trim()}>
        {saving ? "Saving..." : "Save"}
      </Button>
    </form>
  )
}
