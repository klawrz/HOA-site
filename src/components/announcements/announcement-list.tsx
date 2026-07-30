"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Megaphone, Trash2 } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { deleteAnnouncement } from "@/app/actions/announcements"

type AnnouncementRow = {
  id: string
  title: string
  content: string
  createdAt: Date
  author: { name: string | null; email: string; role: string }
}

const authorRoleLabel: Record<string, string> = {
  BOARD_MEMBER: "Board",
  PROPERTY_MANAGER: "Property Manager",
  OWNER: "Board",
}

export function AnnouncementList({
  announcements,
  canManage,
}: {
  announcements: AnnouncementRow[]
  canManage: boolean
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteAnnouncement(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove announcement")
  }

  if (announcements.length === 0) {
    return <p className="text-sm text-gray-500">No announcements yet.</p>
  }

  return (
    <div className="space-y-2">
      {announcements.map((a) => (
        <Card key={a.id}>
          <CardContent className="py-3 px-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <Megaphone className="h-4 w-4 text-purple-500 mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{a.content}</p>
                  <p className="text-xs text-gray-400 mt-1.5">
                    {authorRoleLabel[a.author.role] ?? a.author.role} · {a.author.name ?? a.author.email} ·{" "}
                    {formatDateTime(a.createdAt)}
                  </p>
                </div>
              </div>
              {canManage && (
                <button
                  onClick={() => handleRemove(a.id)}
                  disabled={removingId === a.id}
                  className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
