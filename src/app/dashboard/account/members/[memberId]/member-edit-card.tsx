"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Pencil, Mail, Phone as PhoneIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateMemberContactInfo } from "@/app/actions/org"

export function MemberEditCard({
  memberId,
  name,
  email,
  phone,
}: {
  memberId: string
  name: string | null
  email: string
  phone: string | null
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await updateMemberContactInfo(memberId, {
      name: (form.get("name") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Member updated")
      setEditing(false)
    } else {
      toast.error("Failed to update member")
    }
  }

  if (!editing) {
    return (
      <div className="bg-white border rounded-xl p-5">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">{name ?? email}</h2>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-500 mt-1">
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {email}
              </span>
              {phone && (
                <span className="flex items-center gap-1">
                  <PhoneIcon className="h-3.5 w-3.5" /> {phone}
                </span>
              )}
            </div>
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="font-semibold text-sm text-gray-700 mb-3">Edit Contact Info</h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="space-y-1">
          <Label>Name</Label>
          <Input name="name" defaultValue={name ?? ""} />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input name="phone" defaultValue={phone ?? ""} placeholder="555-000-0000" />
        </div>
        <p className="text-xs text-gray-400">
          Email and role aren&apos;t editable here - email is the login identity, and role changes
          affect unit ownership and access elsewhere in the app.
        </p>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
