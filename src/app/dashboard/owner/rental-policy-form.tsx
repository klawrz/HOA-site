"use client"

import { useState } from "react"
import { toast } from "sonner"
import { RentalPolicy } from "@/generated/prisma"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updateRentalPolicy } from "@/app/actions/units"

const policyLabels: Record<RentalPolicy, string> = {
  ANYONE: "Open to anyone",
  FRIENDS_FAMILY_ONLY: "Friends & family only",
  SHORT_TERM_RENTAL: "Short-term rental (Airbnb/VRBO)",
  NOT_RENTING: "Not renting",
}

const policyColors: Record<RentalPolicy, string> = {
  ANYONE: "text-green-700",
  FRIENDS_FAMILY_ONLY: "text-yellow-700",
  SHORT_TERM_RENTAL: "text-orange-700",
  NOT_RENTING: "text-gray-500",
}

export function RentalPolicyForm({
  ownershipId,
  unitId,
  currentPolicy,
  currentNotes,
}: {
  ownershipId: string
  unitId: string
  currentPolicy: RentalPolicy
  currentNotes: string
}) {
  const [policy, setPolicy] = useState<RentalPolicy>(currentPolicy)
  const [notes, setNotes] = useState(currentNotes)
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    const result = await updateRentalPolicy(ownershipId, unitId, policy, notes)
    setSaving(false)
    if (result.success) {
      toast.success("Rental policy updated")
    } else {
      toast.error("Failed to update policy")
    }
  }

  return (
    <div className="border rounded-lg p-4 space-y-3">
      <p className="text-sm font-medium">Rental Policy</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label className="text-xs">Who can rent this unit?</Label>
          <Select value={policy} onValueChange={(v) => setPolicy(v as RentalPolicy)} items={policyLabels}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(policyLabels) as RentalPolicy[]).map((p) => (
                <SelectItem key={p} value={p}>
                  <span className={policyColors[p]}>{policyLabels[p]}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Notes (visible to property manager)</Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-9 resize-none text-sm"
            placeholder="e.g. Contact via email only"
          />
        </div>
      </div>
      <Button size="sm" onClick={handleSave} disabled={saving}>
        {saving ? "Saving..." : "Save Policy"}
      </Button>
    </div>
  )
}
