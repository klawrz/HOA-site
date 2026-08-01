"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { setOccupancyVisibility, setRentalPoolMembership } from "@/app/actions/occupancy"

export function OccupancyVisibilityForm({
  ownershipId,
  visibleToBoard,
  visibleToPM,
  poolMember,
  occupancyPolicy,
  poolGuidelines,
}: {
  ownershipId: string
  visibleToBoard: boolean
  visibleToPM: boolean
  poolMember: boolean
  occupancyPolicy: string | null
  poolGuidelines: string | null
}) {
  const [board, setBoard] = useState(visibleToBoard)
  const [pm, setPm] = useState(visibleToPM)
  const [pool, setPool] = useState(poolMember)
  const [saving, setSaving] = useState<string | null>(null)

  async function toggleBoard(checked: boolean) {
    setBoard(checked)
    setSaving("board")
    const result = await setOccupancyVisibility(ownershipId, { visibleToBoard: checked })
    setSaving(null)
    if (!result.success) {
      setBoard(!checked)
      toast.error("Failed to update")
    }
  }

  async function togglePm(checked: boolean) {
    setPm(checked)
    setSaving("pm")
    const result = await setOccupancyVisibility(ownershipId, { visibleToPM: checked })
    setSaving(null)
    if (!result.success) {
      setPm(!checked)
      toast.error("Failed to update")
    }
  }

  async function togglePool(checked: boolean) {
    setPool(checked)
    setSaving("pool")
    const result = await setRentalPoolMembership(ownershipId, checked)
    setSaving(null)
    if (!result.success) {
      setPool(!checked)
      toast.error("Failed to update")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Occupancy Visibility</CardTitle>
        <p className="text-xs text-gray-400">
          Entirely your choice, independent per audience - private by default, never required.
        </p>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>Visible to the Board</span>
          <input
            type="checkbox"
            checked={board}
            onChange={(e) => toggleBoard(e.target.checked)}
            disabled={saving === "board"}
          />
        </label>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>Visible to the Property Manager</span>
          <input
            type="checkbox"
            checked={pm}
            onChange={(e) => togglePm(e.target.checked)}
            disabled={saving === "pm"}
          />
        </label>
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span>Join the Rental Pool</span>
          <input
            type="checkbox"
            checked={pool}
            onChange={(e) => togglePool(e.target.checked)}
            disabled={saving === "pool"}
          />
        </label>

        {occupancyPolicy && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-gray-500 mb-1">This HOA&apos;s stated policy</p>
            <p className="text-xs text-gray-600 whitespace-pre-line">{occupancyPolicy}</p>
          </div>
        )}
        {pool && poolGuidelines && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-xs font-medium text-gray-500 mb-1">Rental Pool guidelines</p>
            <p className="text-xs text-gray-600 whitespace-pre-line">{poolGuidelines}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
