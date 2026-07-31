"use client"

import { useEffect, useRef } from "react"
import { markAnnouncementRead } from "@/app/actions/announcements"

// Fire-and-forget: marks every announcement on the page as read once it's
// actually been rendered to the viewer, no button required - the read
// receipt is meant to reflect real visibility, not a click someone has to
// remember to make.
export function MarkAnnouncementsRead({ announcementIds }: { announcementIds: string[] }) {
  const marked = useRef(false)

  useEffect(() => {
    if (marked.current) return
    marked.current = true
    announcementIds.forEach((id) => {
      markAnnouncementRead(id)
    })
  }, [announcementIds])

  return null
}
