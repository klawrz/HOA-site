"use client"

import { useState } from "react"
import { toast } from "sonner"
import { IdCard, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateOrgBillingProfile } from "@/app/actions/platform-admin"

type OwnerData = {
  accountOwnerName: string | null
  accountOwnerTitle: string | null
  accountOwnerEmail: string | null
  accountOwnerPhone: string | null
  accountOwnerAddressLine1: string | null
  accountOwnerAddressLine2: string | null
  accountOwnerCity: string | null
  accountOwnerState: string | null
  accountOwnerPostalCode: string | null
  accountOwnerCountry: string | null
  altContactName: string | null
  altContactEmail: string | null
  altContactPhone: string | null
}

export function AccountOwnerDataCard({
  orgId,
  data,
}: {
  orgId: string
  data: OwnerData
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateOrgBillingProfile(orgId, new FormData(e.currentTarget))
      setEditing(false)
      toast.success("Account Owner data saved")
    } catch {
      toast.error("Failed to save")
    } finally {
      setSaving(false)
    }
  }

  const hasAccountOwnerInfo = !!(data.accountOwnerName || data.accountOwnerEmail || data.accountOwnerPhone)
  const hasAltContactInfo = !!(data.altContactName || data.altContactEmail || data.altContactPhone)
  const accountOwnerCityLine = [data.accountOwnerCity, data.accountOwnerState, data.accountOwnerPostalCode]
    .filter(Boolean)
    .join(", ")
  const accountOwnerAddressLines = [
    data.accountOwnerAddressLine1,
    data.accountOwnerAddressLine2,
    accountOwnerCityLine || null,
    data.accountOwnerCountry,
  ].filter(Boolean) as string[]

  if (!editing) {
    return (
      <div className="bg-white border rounded-xl px-4 py-3 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <IdCard className="h-4 w-4 text-gray-400 shrink-0" />
            {hasAccountOwnerInfo || hasAltContactInfo ? (
              <p className="text-sm text-gray-600">Account Owner &amp; Alternate Contact on file</p>
            ) : (
              <p className="text-sm text-gray-400">No Account Owner data on file</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        {hasAccountOwnerInfo && (
          <>
            <p className="text-xs text-gray-500 pl-6">
              Account Owner: {[data.accountOwnerName, data.accountOwnerTitle, data.accountOwnerEmail, data.accountOwnerPhone].filter(Boolean).join(" · ")}
            </p>
            {accountOwnerAddressLines.length > 0 && (
              <p className="text-xs text-gray-400 pl-6">{accountOwnerAddressLines.join(" · ")}</p>
            )}
          </>
        )}
        {hasAltContactInfo && (
          <p className="text-xs text-gray-500 pl-6">
            Alternate Contact: {[data.altContactName, data.altContactEmail, data.altContactPhone].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-3">
        <IdCard className="h-4 w-4 text-gray-400" /> Account Owner Data
      </h2>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="accountOwnerName" defaultValue={data.accountOwnerName ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Role / Title</Label>
              <Input
                name="accountOwnerTitle"
                defaultValue={data.accountOwnerTitle ?? ""}
                placeholder="e.g. Board President, self-managed Owner"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="accountOwnerEmail" type="email" defaultValue={data.accountOwnerEmail ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="accountOwnerPhone" defaultValue={data.accountOwnerPhone ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Address Line 1</Label>
              <Input name="accountOwnerAddressLine1" defaultValue={data.accountOwnerAddressLine1 ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Address Line 2</Label>
              <Input name="accountOwnerAddressLine2" defaultValue={data.accountOwnerAddressLine2 ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>City</Label>
              <Input name="accountOwnerCity" defaultValue={data.accountOwnerCity ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>State / Province</Label>
              <Input name="accountOwnerState" defaultValue={data.accountOwnerState ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input name="accountOwnerPostalCode" defaultValue={data.accountOwnerPostalCode ?? ""} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input name="accountOwnerCountry" defaultValue={data.accountOwnerCountry ?? ""} />
          </div>
        </div>

        <div className="pt-2 border-t space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alternate Contact</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="altContactName" defaultValue={data.altContactName ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="altContactEmail" type="email" defaultValue={data.altContactEmail ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="altContactPhone" defaultValue={data.altContactPhone ?? ""} />
            </div>
          </div>
        </div>

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
