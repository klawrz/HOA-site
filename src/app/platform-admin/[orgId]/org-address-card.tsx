"use client"

import { useState } from "react"
import { toast } from "sonner"
import { MapPin, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateOrgAddressAdmin } from "@/app/actions/platform-admin"

type Address = {
  addressLine1: string | null
  addressLine2: string | null
  city: string | null
  state: string | null
  postalCode: string | null
  country: string | null
}

function addressLines(a: Address) {
  const line2 = [a.city, a.state, a.postalCode].filter(Boolean).join(", ")
  return [a.addressLine1, a.addressLine2, line2, a.country].filter(Boolean)
}

export function OrgAddressCard({ orgId, address }: { orgId: string; address: Address }) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const lines = addressLines(address)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateOrgAddressAdmin(orgId, new FormData(e.currentTarget))
      setEditing(false)
      toast.success("Address saved")
    } catch {
      toast.error("Failed to save address")
    } finally {
      setSaving(false)
    }
  }

  if (!editing) {
    return (
      <div className="bg-white border rounded-xl px-4 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
          {lines.length > 0 ? (
            <p className="text-sm text-gray-600 truncate">{lines.join(" · ")}</p>
          ) : (
            <p className="text-sm text-gray-400">No property address on file</p>
          )}
        </div>
        <button
          onClick={() => setEditing(true)}
          className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
        >
          <Pencil className="h-3 w-3" /> Edit
        </button>
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-3">
        <MapPin className="h-4 w-4 text-gray-400" /> Property Address
      </h2>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Address Line 1</Label>
            <Input name="addressLine1" defaultValue={address.addressLine1 ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Address Line 2</Label>
            <Input name="addressLine2" defaultValue={address.addressLine2 ?? ""} />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>City</Label>
            <Input name="city" defaultValue={address.city ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>State / Province</Label>
            <Input name="state" defaultValue={address.state ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Postal Code</Label>
            <Input name="postalCode" defaultValue={address.postalCode ?? ""} />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Country</Label>
          <Input name="country" defaultValue={address.country ?? ""} />
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="outline" size="sm" disabled={saving}>
            {saving ? "Saving..." : "Save Address"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  )
}
