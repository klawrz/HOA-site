"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Trash2, Eye, MessageCircle } from "lucide-react"
import { formatDateTime } from "@/lib/utils"
import { deleteAnnouncement, addAnnouncementComment, deleteAnnouncementComment } from "@/app/actions/announcements"

type CommentRow = {
  id: string
  content: string
  createdAt: Date
  authorId: string
  author: { name: string | null; email: string; role: string }
}

type AnnouncementRow = {
  id: string
  title: string
  content: string
  createdAt: Date
  author: { name: string | null; email: string; role: string }
  comments: CommentRow[]
  readCount?: number
}

const authorRoleLabel: Record<string, string> = {
  BOARD_MEMBER: "Board",
  PROPERTY_MANAGER: "Property Manager",
  OWNER: "Owner",
}

function CommentThread({
  announcementId,
  comments,
  currentUserId,
  canModerate,
}: {
  announcementId: string
  comments: CommentRow[]
  currentUserId: string
  canModerate: boolean
}) {
  const [content, setContent] = useState("")
  const [posting, setPosting] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function handlePost() {
    const trimmed = content.trim()
    if (!trimmed) return
    setPosting(true)
    const result = await addAnnouncementComment(announcementId, trimmed)
    setPosting(false)
    if (result.success) {
      setContent("")
    } else {
      toast.error(result.error || "Failed to post comment")
    }
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = await deleteAnnouncementComment(id)
    setRemovingId(null)
    if (!result.success) toast.error("Failed to remove comment")
  }

  return (
    <div className="mt-3 pt-3 border-t space-y-2">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start justify-between gap-2 bg-gray-50 rounded-lg px-3 py-2">
          <div className="min-w-0">
            <p className="text-sm">{c.content}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {authorRoleLabel[c.author.role] ?? c.author.role} · {c.author.name ?? c.author.email} ·{" "}
              {formatDateTime(c.createdAt)}
            </p>
          </div>
          {(canModerate || c.authorId === currentUserId) && (
            <button
              onClick={() => handleRemove(c.id)}
              disabled={removingId === c.id}
              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      ))}
      <div className="flex items-end gap-2">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Ask a question or reply..."
          className="h-9 min-h-9 resize-none py-2 text-sm"
        />
        <Button size="sm" onClick={handlePost} disabled={posting || !content.trim()}>
          {posting ? "Posting..." : "Post"}
        </Button>
      </div>
    </div>
  )
}

export function AnnouncementList({
  announcements,
  canManage,
  currentUserId,
}: {
  announcements: AnnouncementRow[]
  canManage: boolean
  currentUserId: string
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)

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
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <p className="text-sm text-gray-600 mt-1 whitespace-pre-line">{a.content}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <p className="text-xs text-gray-400">
                      {authorRoleLabel[a.author.role] ?? a.author.role} · {a.author.name ?? a.author.email} ·{" "}
                      {formatDateTime(a.createdAt)}
                    </p>
                    {canManage && a.readCount != null && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Eye className="h-3 w-3" /> Read by {a.readCount}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      <MessageCircle className="h-3 w-3" />
                      {a.comments.length > 0 ? `${a.comments.length} repl${a.comments.length !== 1 ? "ies" : "y"}` : "Reply"}
                    </button>
                  </div>
                  {expandedId === a.id && (
                    <CommentThread
                      announcementId={a.id}
                      comments={a.comments}
                      currentUserId={currentUserId}
                      canModerate={canManage}
                    />
                  )}
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
