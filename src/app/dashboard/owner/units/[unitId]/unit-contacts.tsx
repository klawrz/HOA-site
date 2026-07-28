"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { addUnitContact, removeUnitContact } from "@/app/actions/unit-profile"
import { UnitContactKind } from "@/generated/prisma"

interface Contact {
  id: string
  kind: UnitContactKind
  name: string
  phone: string
  email: string | null
}

const KIND_ITEMS = { PRIME: "Prime Contact", EMERGENCY: "Emergency Contact" }

export function UnitContacts({ unitId, contacts }: { unitId: string; contacts: Contact[] }) {
  const [kind, setKind] = useState<UnitContactKind>("PRIME")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  const primeCount = contacts.filter((c) => c.kind === "PRIME").length
  const emergencyCount = contacts.filter((c) => c.kind === "EMERGENCY").length

  async function handleAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (kind === "PRIME" && primeCount >= 1) {
      toast.error("Only one prime contact is needed - remove the existing one first")
      return
    }
    if (kind === "EMERGENCY" && emergencyCount >= 2) {
      toast.error("Only 2 emergency contacts are needed - remove one first")
      return
    }
    setSaving(true)
    const form = new FormData(e.currentTarget)
    const result = await addUnitContact({
      unitId,
      kind,
      name: form.get("name") as string,
      phone: form.get("phone") as string,
      email: (form.get("email") as string) || undefined,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Contact added")
      e.currentTarget.reset()
    } else {
      toast.error("Failed to add contact")
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await removeUnitContact(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove contact")
  }

  return (
    <div className="space-y-4">
      {["PRIME", "EMERGENCY"].map((k) => {
        const kindContacts = contacts.filter((c) => c.kind === k)
        if (kindContacts.length === 0) return null
        return (
          <div key={k}>
            <p className="text-xs font-medium text-gray-500 mb-1">{KIND_ITEMS[k as UnitContactKind]}{k === "EMERGENCY" ? "s" : ""}</p>
            <div className="space-y-2">
              {kindContacts.map((c) => (
                <div key={c.id} className="flex items-center justify-between border rounded-lg p-2 text-sm">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-gray-500">{c.phone}{c.email && ` · ${c.email}`}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemove(c.id)}
                    disabled={removingId === c.id}
                  >
                    {removingId === c.id ? "Removing..." : "Remove"}
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      {contacts.length === 0 && (
        <p className="text-sm text-gray-500">No contacts on file yet.</p>
      )}

      <form onSubmit={handleAdd} className="space-y-2 pt-2 border-t">
        <div className="space-y-1">
          <Label>Type</Label>
          <Select value={kind} onValueChange={(v) => setKind(v as UnitContactKind)} items={KIND_ITEMS}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PRIME">Prime Contact</SelectItem>
              <SelectItem value="EMERGENCY">Emergency Contact</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label>Name</Label>
            <Input name="name" required />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input name="phone" required />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Email</Label>
          <Input name="email" type="email" />
        </div>
        <Button type="submit" size="sm" disabled={saving}>
          {saving ? "Adding..." : "+ Add Contact"}
        </Button>
      </form>
    </div>
  )
}
