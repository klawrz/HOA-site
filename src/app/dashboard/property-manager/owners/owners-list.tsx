"use client"

import { useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  ListSearch,
  ListFilterChips,
  ListPager,
  paginate,
  pageCountFor,
  useListControls,
  type ChipOption,
} from "@/components/ui/list-controls"

const PAGE_SIZE = 20

const policyColor: Record<string, string> = {
  ANYONE: "bg-green-100 text-green-800",
  FRIENDS_FAMILY_ONLY: "bg-yellow-100 text-yellow-800",
  SHORT_TERM_RENTAL: "bg-orange-100 text-orange-800",
  NOT_RENTING: "bg-gray-100 text-gray-600",
}
const policyLabel: Record<string, string> = {
  ANYONE: "Open to anyone",
  FRIENDS_FAMILY_ONLY: "Friends & family",
  SHORT_TERM_RENTAL: "Short-term rental",
  NOT_RENTING: "Not renting",
}
const POLICY_ORDER = ["ANYONE", "FRIENDS_FAMILY_ONLY", "SHORT_TERM_RENTAL", "NOT_RENTING"] as const

export type OwnerRow = {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  units: { id: string; name: string; rentalPolicy: string; rented: boolean }[]
}

export function OwnersList({ owners }: { owners: OwnerRow[] }) {
  const { search, setSearch, filterFor, toggleFilter, page, setPage } = useListControls()
  const policySel = filterFor("policy")

  const policyOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<string, number>()
    for (const o of owners) {
      const seen = new Set(o.units.map((u) => u.rentalPolicy))
      for (const p of seen) counts.set(p, (counts.get(p) ?? 0) + 1)
    }
    return POLICY_ORDER.filter((p) => counts.has(p)).map((p) => ({
      value: p,
      label: policyLabel[p],
      count: counts.get(p),
    }))
  }, [owners])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return owners.filter((o) => {
      if (policySel.length > 0 && !o.units.some((u) => policySel.includes(u.rentalPolicy))) return false
      if (!q) return true
      const hay = `${o.name ?? ""} ${o.email ?? ""} ${o.phone ?? ""} ${o.units.map((u) => u.name).join(" ")}`.toLowerCase()
      return hay.includes(q)
    })
  }, [owners, search, policySel])

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  return (
    <div className="space-y-3">
      <ListSearch value={search} onChange={setSearch} placeholder="Search by owner name, email, phone or unit..." />

      {policyOptions.length > 1 && (
        <ListFilterChips
          label="Rental policy"
          options={policyOptions}
          selected={policySel}
          onToggle={toggleFilter("policy")}
        />
      )}

      <div className="grid gap-4">
        {visible.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center text-gray-500">
              {owners.length === 0 ? "No owners registered yet." : "No owners match your search."}
            </CardContent>
          </Card>
        )}
        {visible.map((owner) => (
          <Card key={owner.id}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <CardTitle className="text-base">{owner.name ?? "Unnamed"}</CardTitle>
                  <p className="text-sm text-gray-500 break-words">{owner.email}</p>
                  {owner.phone && <p className="text-sm text-gray-500">{owner.phone}</p>}
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full shrink-0">
                  {owner.units.length} unit{owner.units.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {owner.units.length === 0 ? (
                <p className="text-sm text-gray-400">No units assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {owner.units.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border text-sm"
                    >
                      <span className="font-semibold">{u.name}</span>
                      <span
                        className={`text-xs px-1.5 py-0.5 rounded-full ${policyColor[u.rentalPolicy] ?? policyColor.NOT_RENTING}`}
                      >
                        {policyLabel[u.rentalPolicy] ?? u.rentalPolicy}
                      </span>
                      {u.rented && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">Rented</span>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <ListPager page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} noun="owners" />
    </div>
  )
}
