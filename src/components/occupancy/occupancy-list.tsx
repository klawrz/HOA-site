"use client"

import { useMemo, useState } from "react"
import { TodayOccupancy } from "./today-occupancy"
import {
  ListSearch,
  ListFilterChips,
  ListPager,
  paginate,
  pageCountFor,
  useListControls,
  type ChipOption,
} from "@/components/ui/list-controls"

const PAGE_SIZE = 25

type Entry = {
  id: string
  startDate: Date
  endDate: Date
  type: string
  occupantName: string | null
  occupantContact: string | null
  notes: string | null
}

type UnitOccupancy = {
  id: string
  number: string
  building: string | null
  entries: Entry[]
  activeLease?: { renterName: string | null; startDate: Date } | null
}

// Same three states TodayOccupancy's own summary line derives, so the
// filter chips match what the row actually shows. "vacant" also covers
// units whose owner has kept occupancy private - indistinguishable from
// "nothing logged" by design, hence the chip label.
type Bucket = "occupied" | "rented" | "vacant"

function bucketFor(u: UnitOccupancy, now: number): Bucket {
  if (u.entries.some((e) => new Date(e.startDate).getTime() <= now && new Date(e.endDate).getTime() >= now)) {
    return "occupied"
  }
  if (u.activeLease && new Date(u.activeLease.startDate).getTime() <= now) return "rented"
  return "vacant"
}

const BUCKET_LABEL: Record<Bucket, string> = {
  occupied: "Occupied now",
  rented: "Rented",
  vacant: "Vacant / no detail",
}
const BUCKET_ORDER: Bucket[] = ["occupied", "rented", "vacant"]

export function OccupancyList({
  units,
  unitLabel,
}: {
  units: UnitOccupancy[]
  unitLabel: string
}) {
  const { search, setSearch, filterFor, toggleFilter, page, setPage } = useListControls()
  const stateSel = filterFor("state")
  // Evaluate "now" once for the life of the component - stable across
  // renders, and an occupancy board doesn't need to tick live.
  const [now] = useState(() => Date.now())

  const noun = `${unitLabel.toLowerCase()}${units.length === 1 ? "" : "s"}`

  const buckets = useMemo(() => new Map(units.map((u) => [u.id, bucketFor(u, now)])), [units, now])

  const stateOptions: ChipOption[] = useMemo(() => {
    const counts = new Map<Bucket, number>()
    for (const b of buckets.values()) counts.set(b, (counts.get(b) ?? 0) + 1)
    return BUCKET_ORDER.filter((b) => counts.has(b)).map((b) => ({
      value: b,
      label: BUCKET_LABEL[b],
      count: counts.get(b),
    }))
  }, [buckets])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return units.filter((u) => {
      if (stateSel.length > 0 && !stateSel.includes(buckets.get(u.id) as string)) return false
      if (!q) return true
      const hay = [
        u.number,
        u.building ?? "",
        u.activeLease?.renterName ?? "",
        ...u.entries.map((e) => e.occupantName ?? ""),
      ]
        .join(" ")
        .toLowerCase()
      return hay.includes(q)
    })
  }, [units, search, stateSel, buckets])

  const pageCount = pageCountFor(filtered.length, PAGE_SIZE)
  const safePage = Math.min(page, pageCount)
  const visible = paginate(filtered, safePage, PAGE_SIZE)

  return (
    <div className="space-y-3">
      <ListSearch
        value={search}
        onChange={setSearch}
        placeholder={`Search by ${unitLabel.toLowerCase()} number or occupant...`}
      />

      {stateOptions.length > 1 && (
        <ListFilterChips
          label="State"
          options={stateOptions}
          selected={stateSel}
          onToggle={toggleFilter("state")}
        />
      )}

      {filtered.length === 0 ? (
        <div className="bg-white border rounded-xl text-center py-12 text-gray-400">
          {units.length === 0
            ? `No ${unitLabel.toLowerCase()}s yet`
            : `No ${unitLabel.toLowerCase()}s match your search`}
        </div>
      ) : (
        <TodayOccupancy unitLabel={unitLabel} units={visible} canManage={false} />
      )}

      <ListPager
        page={safePage}
        pageSize={PAGE_SIZE}
        total={filtered.length}
        onPageChange={setPage}
        noun={noun}
      />
    </div>
  )
}
