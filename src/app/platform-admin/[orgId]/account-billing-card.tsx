"use client"

import { useState } from "react"
import { toast } from "sonner"
import { CreditCard, Pencil } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { updateOrgBillingProfile } from "@/app/actions/platform-admin"

type Billing = {
  accountNumber: string | null
  pricingPlan: string | null
  billingExpiry: Date | null
}

function toDateInputValue(d: Date | null) {
  if (!d) return ""
  return d.toISOString().slice(0, 10)
}

export function AccountBillingCard({
  orgId,
  createdAt,
  billing,
}: {
  orgId: string
  createdAt: Date
  billing: Billing
}) {
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    try {
      await updateOrgBillingProfile(orgId, new FormData(e.currentTarget))
      setEditing(false)
      toast.success("Billing details saved")
    } catch {
      toast.error("Failed to save billing details")
    } finally {
      setSaving(false)
    }
  }

  const summaryParts = [
    billing.accountNumber ? `Acct #${billing.accountNumber}` : null,
    billing.pricingPlan,
    billing.billingExpiry ? `expires ${billing.billingExpiry.toLocaleDateString()}` : null,
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
              <p className="text-sm text-gray-400">No billing plan/account number on file</p>
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
      </div>
    )
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <h2 className="font-semibold text-sm text-gray-700 flex items-center gap-2 mb-1">
        <CreditCard className="h-4 w-4 text-gray-400" /> Billing
      </h2>
      <p className="text-xs text-gray-400 mb-3">Signed up {createdAt.toLocaleDateString()}</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>Account Number</Label>
            <Input name="accountNumber" defaultValue={billing.accountNumber ?? ""} />
          </div>
          <div className="space-y-1">
            <Label>Pricing Plan</Label>
            <Input name="pricingPlan" defaultValue={billing.pricingPlan ?? ""} placeholder="$49/mo Standard" />
          </div>
          <div className="space-y-1">
            <Label>Billing Expiry</Label>
            <Input name="billingExpiry" type="date" defaultValue={toDateInputValue(billing.billingExpiry)} />
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
