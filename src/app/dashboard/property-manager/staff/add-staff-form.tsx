"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { addStaffMember } from "@/app/actions/pm"

export function AddStaffForm() {
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await addStaffMember(email)
    setSaving(false)
    if (result.success) {
      toast.success("Staff member added")
      setEmail("")
    } else {
      toast.error(result.error ?? "Failed to add staff member")
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <form onSubmit={handleSubmit} className="flex gap-2 items-end">
          <div className="flex-1 space-y-1">
            <label className="text-sm font-medium">Add staff by email</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Existing Property Manager account email"
              required
            />
          </div>
          <Button type="submit" disabled={saving || !email}>
            {saving ? "Adding..." : "Add"}
          </Button>
        </form>
        <p className="text-xs text-gray-400 mt-2">
          The person must already have a Property Manager account in HOPE.
        </p>
      </CardContent>
    </Card>
  )
}
