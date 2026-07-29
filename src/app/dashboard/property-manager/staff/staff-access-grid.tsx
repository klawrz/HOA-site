"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { setAccessGrant, removeStaffMember } from "@/app/actions/pm"
import { PMAccessArea, PMAccessLevel } from "@/generated/prisma"

const AREAS: PMAccessArea[] = ["TICKETS", "CONTRACTS", "DOCUMENTS", "STAFF"]
const AREA_LABELS: Record<PMAccessArea, string> = {
  TICKETS: "Tickets",
  CONTRACTS: "Contracts",
  DOCUMENTS: "Documents",
  STAFF: "Staff",
}
const LEVEL_ITEMS = { NONE: "No access", VIEW: "View", MANAGE: "Manage" }

interface Grant {
  orgId: string
  area: PMAccessArea
  level: PMAccessLevel
}

export function StaffAccessGrid({
  membershipId,
  orgs,
  grants,
  canEdit,
  canRemove,
  isCompanyCreator,
}: {
  membershipId: string
  isSelf: boolean
  isCompanyCreator: boolean
  canEdit: boolean
  canRemove: boolean
  orgs: { id: string; name: string }[]
  grants: Grant[]
}) {
  const [current, setCurrent] = useState(grants)
  const [removing, setRemoving] = useState(false)

  function levelFor(orgId: string, area: PMAccessArea): "NONE" | PMAccessLevel {
    return current.find((g) => g.orgId === orgId && g.area === area)?.level ?? "NONE"
  }

  async function handleChange(orgId: string, area: PMAccessArea, value: string | null) {
    const level = value === "NONE" || !value ? null : (value as PMAccessLevel)
    setCurrent((prev) => {
      const rest = prev.filter((g) => !(g.orgId === orgId && g.area === area))
      return level ? [...rest, { orgId, area, level }] : rest
    })
    const result = await setAccessGrant(membershipId, orgId, area, level)
    if (!result.success) toast.error("Failed to update access")
  }

  async function handleRemove() {
    setRemoving(true)
    const result = await removeStaffMember(membershipId)
    setRemoving(false)
    if (!result.success) toast.error(result.error ?? "Failed to remove staff member")
  }

  return (
    <div className="space-y-3">
      {isCompanyCreator ? (
        <p className="text-sm text-gray-500">Full access - company administrator.</p>
      ) : (
        orgs.map((org) => (
          <div key={org.id} className="border rounded-lg p-3">
            <p className="text-sm font-medium mb-2">{org.name}</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {AREAS.map((area) => (
                <div key={area} className="space-y-1">
                  <label className="text-xs text-gray-400">{AREA_LABELS[area]}</label>
                  <Select
                    value={levelFor(org.id, area)}
                    onValueChange={(v) => handleChange(org.id, area, v)}
                    items={LEVEL_ITEMS}
                    disabled={!canEdit}
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
          </div>
        ))
      )}
      {canRemove && (
        <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing}>
          {removing ? "Removing..." : "Remove from company"}
        </Button>
      )}
    </div>
  )
}
