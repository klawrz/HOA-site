"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  assignUnitManager,
  removeUnitManager,
  setUnitManagerGrant,
} from "@/app/actions/unit-profile"
import { UnitManagerArea, UnitManagerLevel } from "@/generated/prisma"

const AREAS: UnitManagerArea[] = ["GUESTS", "CLEANING", "TICKETS"]
const AREA_LABELS: Record<UnitManagerArea, string> = {
  GUESTS: "Guests",
  CLEANING: "Cleaning",
  TICKETS: "Tickets",
}
const LEVEL_ITEMS = { NONE: "No access", VIEW: "View", MANAGE: "Manage" }

interface Grant {
  area: UnitManagerArea
  level: UnitManagerLevel
}

interface ManagerAssignment {
  id: string
  name: string | null
  email: string
  grants: Grant[]
}

function ManagerGrantRow({
  assignmentId,
  grants,
}: {
  assignmentId: string
  grants: Grant[]
}) {
  const [current, setCurrent] = useState(grants)

  function levelFor(area: UnitManagerArea): "NONE" | UnitManagerLevel {
    return current.find((g) => g.area === area)?.level ?? "NONE"
  }

  async function handleChange(area: UnitManagerArea, value: string | null) {
    const level = value === "NONE" || !value ? null : (value as UnitManagerLevel)
    setCurrent((prev) => {
      const rest = prev.filter((g) => g.area !== area)
      return level ? [...rest, { area, level }] : rest
    })
    const result = await setUnitManagerGrant(assignmentId, area, level)
    if (!result.success) toast.error("Failed to update access")
  }

  return (
    <div className="grid grid-cols-3 gap-2 mt-2">
      {AREAS.map((area) => (
        <div key={area} className="space-y-1">
          <label className="text-xs text-gray-400">{AREA_LABELS[area]}</label>
          <Select
            value={levelFor(area)}
            onValueChange={(v) => handleChange(area, v)}
            items={LEVEL_ITEMS}
          >
            <SelectTrigger className="h-8 text-xs w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE">No access</SelectItem>
              <SelectItem value="VIEW">View</SelectItem>
              <SelectItem value="MANAGE">Manage</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ))}
    </div>
  )
}

export function UnitManagers({
  unitId,
  managers,
}: {
  unitId: string
  managers: ManagerAssignment[]
}) {
  const [email, setEmail] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await assignUnitManager(unitId, email)
    setSaving(false)
    if (result.success) {
      toast.success("Unit Manager assigned")
      setEmail("")
    } else {
      toast.error(result.error ?? "Failed to assign Unit Manager")
    }
  }

  async function handleRemove(assignmentId: string) {
    setRemovingId(assignmentId)
    const result = await removeUnitManager(assignmentId)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove Unit Manager")
  }

  return (
    <div className="space-y-4">
      {managers.map((m) => (
        <div key={m.id} className="border rounded-lg p-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{m.name ?? m.email}</p>
              <p className="text-xs text-gray-400">{m.email}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleRemove(m.id)}
              disabled={removingId === m.id}
            >
              {removingId === m.id ? "Removing..." : "Remove"}
            </Button>
          </div>
          <ManagerGrantRow assignmentId={m.id} grants={m.grants} />
        </div>
      ))}

      {managers.length === 0 && (
        <p className="text-sm text-gray-500">No Unit Manager assigned yet.</p>
      )}

      <form onSubmit={handleAssign} className="flex gap-2 items-end pt-2 border-t">
        <div className="flex-1 space-y-1">
          <label className="text-sm font-medium">Assign by email</label>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Existing Unit Manager account email"
            required
          />
        </div>
        <Button type="submit" disabled={saving || !email}>
          {saving ? "Assigning..." : "Assign"}
        </Button>
      </form>
      <p className="text-xs text-gray-400">
        The person must already have a Unit Manager account in HOPE.
      </p>
    </div>
  )
}
