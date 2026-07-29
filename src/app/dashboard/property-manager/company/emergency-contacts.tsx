"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { addEmergencyContact, removeEmergencyContact } from "@/app/actions/pm"

interface Contact {
  id: string
  name: string
  role: string | null
  phone: string
  email: string | null
  notes: string | null
}

export function EmergencyContacts({ contacts, canEdit }: { contacts: Contact[]; canEdit: boolean }) {
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await addEmergencyContact({
      name: form.get("name") as string,
      role: (form.get("role") as string) || undefined,
      phone: form.get("phone") as string,
      email: (form.get("email") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Emergency contact added")
      e.currentTarget.reset()
    } else {
      toast.error("Failed to add contact")
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await removeEmergencyContact(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove contact")
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Emergency Contacts</CardTitle>
        <p className="text-xs text-gray-400">
          Who an HOA or resident should call outside normal business hours.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-3 border rounded-lg p-3">
            <div>
              <p className="font-medium text-sm">
                {c.name}
                {c.role && <span className="text-gray-400 font-normal"> · {c.role}</span>}
              </p>
              <p className="text-xs text-gray-500">{c.phone}</p>
              {c.email && <p className="text-xs text-gray-500">{c.email}</p>}
            </div>
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRemove(c.id)}
                disabled={removingId === c.id}
              >
                {removingId === c.id ? "Removing..." : "Remove"}
              </Button>
            )}
          </div>
        ))}

        {contacts.length === 0 && (
          <p className="text-sm text-gray-500">No emergency contacts on file yet.</p>
        )}

        {canEdit && (
          <form onSubmit={handleAdd} className="space-y-2 pt-2 border-t">
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input name="name" required />
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Input name="role" placeholder="e.g. After-hours dispatch" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label>Phone</Label>
                <Input name="phone" required />
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input name="email" type="email" />
              </div>
            </div>
            <Button type="submit" size="sm" disabled={saving}>
              {saving ? "Adding..." : "+ Add Emergency Contact"}
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  )
}
