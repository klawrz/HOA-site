"use client"

import { useState } from "react"
import { Archive, ChevronRight, ChevronDown } from "lucide-react"
import { AnnouncementList } from "./announcement-list"

type AnnouncementRow = React.ComponentProps<typeof AnnouncementList>["announcements"][number]

// Collapsed by default deliberately - archived announcements are exactly
// the ones nobody needs to see day-to-day (that's why they were archived),
// so keeping this closed until asked-for is part of the same "tighten up
// vertical space" pass that compacted the active list's own rows.
export function ArchivedAnnouncementsSection({
  announcements,
  currentUserId,
}: {
  announcements: AnnouncementRow[]
  currentUserId: string
}) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mt-3 pt-3 border-t">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        <Archive className="h-3.5 w-3.5" />
        Archived ({announcements.length})
      </button>
      {open && (
        <div className="mt-2">
          <AnnouncementList announcements={announcements} canManage currentUserId={currentUserId} archivedView />
        </div>
      )}
    </div>
  )
}
