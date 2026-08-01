"use client"

import { useState } from "react"
import { toast } from "sonner"
import { setRentalPoolMembership } from "@/app/actions/occupancy"

interface UnitRow {
  ownershipId: string
  number: string
  building: string | null
  member: boolean
}

export function RentalPoolToggleList({ units }: { units: UnitRow[] }) {
  const [state, setState] = useState<Record<string, boolean>>(
    Object.fromEntries(units.map((u) => [u.ownershipId, u.member]))
  )
  const [saving, setSaving] = useState<string | null>(null)

  async function toggle(ownershipId: string, checked: boolean) {
    setState((prev) => ({ ...prev, [ownershipId]: checked }))
    setSaving(ownershipId)
    const result = await setRentalPoolMembership(ownershipId, checked)
    setSaving(null)
    if (!result.success) {
      setState((prev) => ({ ...prev, [ownershipId]: !checked }))
      toast.error("Failed to update")
    }
  }

  return (
    <div className="space-y-2">
      {units.map((u) => (
        <label
          key={u.ownershipId}
          className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2 text-sm cursor-pointer"
        >
          <span>
            Unit {u.number}
            {u.building && ` — Building ${u.building}`}
          </span>
          <input
            type="checkbox"
            checked={state[u.ownershipId]}
            onChange={(e) => toggle(u.ownershipId, e.target.checked)}
            disabled={saving === u.ownershipId}
          />
        </label>
      ))}
    </div>
  )
}
