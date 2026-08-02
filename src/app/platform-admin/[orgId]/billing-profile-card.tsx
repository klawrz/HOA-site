"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CreditCard, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateOrgBillingProfile } from "@/app/actions/platform-admin"

type BillingProfile = {
  accountNumber: string | null
  pricingPlan: string | null
  billingExpiry: Date | null
  accountOwnerName: string | null
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

function toDateInputValue(d: Date | null) {
  if (!d) return ""
  return d.toISOString().slice(0, 10)
}

export function BillingProfileCard({
  orgId,
  createdAt,
  profile,
}: {
  orgId: string
  createdAt: Date
  profile: BillingProfile
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateOrgBillingProfile(orgId, new FormData(e.currentTarget))
      setEditing(false)
      toast.success("Billing profile saved")
    } catch {
      toast.error("Failed to save billing profile")
    } finally {
      setSaving(false)
    }
  }

  const summaryParts = [
    profile.accountNumber ? `Acct #${profile.accountNumber}` : null,
    profile.pricingPlan,
    profile.billingExpiry ? `expires ${profile.billingExpiry.toLocaleDateString()}` : null,
  ].filter(Boolean)

  if (!editing) {
    return (
      <div className="bg-white border rounded-xl px-4 py-3 space-y-1">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CreditCard className="h-4 w-4 text-gray-400 shrink-0" />
            {summaryParts.length > 0 ? (
              <p className="text-sm text-gray-600 truncate">{summaryParts.join(" · ")}</p>
            ) : (
              <p className="text-sm text-gray-400">No billing/account details on file</p>
            )}
          </div>
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 shrink-0"
          >
            <Pencil className="h-3 w-3" /> Edit
          </button>
        </div>
        <p className="text-xs text-gray-400 pl-6">Signed up {createdAt.toLocaleDateString()}</p>
        {(profile.accountOwnerName || profile.accountOwnerEmail || profile.accountOwnerPhone) && (
          <p className="text-xs text-gray-500 pl-6">
            Account Owner: {[profile.accountOwnerName, profile.accountOwnerEmail, profile.accountOwnerPhone].filter(Boolean).join(" · ")}
          </p>
        )}
        {(profile.altContactName || profile.altContactEmail || profile.altContactPhone) && (
          <p className="text-xs text-gray-500 pl-6">
            Alternate Contact: {[profile.altContactName, profile.altContactEmail, profile.altContactPhone].filter(Boolean).join(" · ")}
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-1">
        <CreditCard className="h-4 w-4 text-gray-400" /> Billing & Account
      </h2>
      <p className="text-xs text-gray-400 mb-3">Signed up {createdAt.toLocaleDateString()}</p>
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account & Billing</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Account Number</Label>
              <Input name="accountNumber" defaultValue={profile.accountNumber ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Pricing Plan</Label>
              <Input name="pricingPlan" defaultValue={profile.pricingPlan ?? ""} placeholder="$49/mo Standard" />
            </div>
            <div className="space-y-1">
              <Label>Billing Expiry</Label>
              <Input name="billingExpiry" type="date" defaultValue={toDateInputValue(profile.billingExpiry)} />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Owner</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="accountOwnerName" defaultValue={profile.accountOwnerName ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="accountOwnerEmail" type="email" defaultValue={profile.accountOwnerEmail ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="accountOwnerPhone" defaultValue={profile.accountOwnerPhone ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Address Line 1</Label>
              <Input name="accountOwnerAddressLine1" defaultValue={profile.accountOwnerAddressLine1 ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Address Line 2</Label>
              <Input name="accountOwnerAddressLine2" defaultValue={profile.accountOwnerAddressLine2 ?? ""} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>City</Label>
              <Input name="accountOwnerCity" defaultValue={profile.accountOwnerCity ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>State / Province</Label>
              <Input name="accountOwnerState" defaultValue={profile.accountOwnerState ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Postal Code</Label>
              <Input name="accountOwnerPostalCode" defaultValue={profile.accountOwnerPostalCode ?? ""} />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Country</Label>
            <Input name="accountOwnerCountry" defaultValue={profile.accountOwnerCountry ?? ""} />
          </div>
        </div>

        <div className="space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Alternate Contact</h3>
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Name</Label>
              <Input name="altContactName" defaultValue={profile.altContactName ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="altContactEmail" type="email" defaultValue={profile.altContactEmail ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="altContactPhone" defaultValue={profile.altContactPhone ?? ""} />
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
