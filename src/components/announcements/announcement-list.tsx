"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Megaphone, Trash2, Eye, MessageCircle, Users, Clock, ArchiveRestore, Archive } from "lucide-react"
import { formatDateISO, formatDateTime } from "@/lib/utils"
import {
  archiveAnnouncement,
  restoreAnnouncement,
  addAnnouncementComment,
  deleteAnnouncementComment,
} from "@/app/actions/announcements"
import { parseVisibleRoles, audienceRoleLabel } from "@/lib/audience"
import { NewAnnouncementDialog } from "./new-announcement-dialog"

type CommentRow = {
  id: string
  content: string
  createdAt: Date
  authorId: string
  author: { name: string | null; email: string | null; role: string }
}

type AnnouncementRow = {
  id: string
  title: string
  content: string
  createdAt: Date
  author: { name: string | null; email: string | null; role: string }
  comments: CommentRow[]
  readCount?: number
  visibleRoles?: string | null
  removeAfter?: Date | null
  postOn?: Date | null
  archivedAt?: Date | null
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
  archivedView,
}: {
  announcements: AnnouncementRow[]
  canManage: boolean
  currentUserId: string
  // Renders the Restore action instead of Archive, and skips the
  // scheduled/expiry badges (irrelevant once something's already archived).
  archivedView?: boolean
}) {
  const [removingId, setRemovingId] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [expandedContent, setExpandedContent] = useState<Set<string>>(new Set())

  function toggleContent(id: string) {
    setExpandedContent((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  async function handleRemove(id: string) {
    setRemovingId(id)
    const result = archivedView ? await restoreAnnouncement(id) : await archiveAnnouncement(id)
    setRemovingId(null)
    if (!result.success) toast.error(archivedView ? "Failed to restore announcement" : "Failed to archive announcement")
  }

  if (announcements.length === 0) {
    return <p className="text-sm text-gray-500">{archivedView ? "Nothing archived." : "No announcements yet."}</p>
  }

  return (
    <div className="space-y-1.5">
      {announcements.map((a) => {
        const isLong = a.content.length > 140 || a.content.includes("\n")
        const showFull = expandedContent.has(a.id)
        return (
          <div key={a.id} className="bg-gray-50 rounded-lg px-3 py-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <Megaphone className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-sm">{a.title}</span>
                    <span className="text-xs text-gray-400">
                      {authorRoleLabel[a.author.role] ?? a.author.role} · {a.author.name ?? a.author.email} ·{" "}
                      {formatDateTime(a.createdAt)}
                    </span>
                  </div>
                  <p
                    className={`text-sm text-gray-600 mt-0.5 whitespace-pre-line ${!showFull && isLong ? "line-clamp-2" : ""}`}
                  >
                    {a.content}
                  </p>
                  {isLong && (
                    <button
                      onClick={() => toggleContent(a.id)}
                      className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
                    >
                      {showFull ? "Show less" : "Show more"}
                    </button>
                  )}
                  <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                    {canManage && a.readCount != null && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Eye className="h-3 w-3" /> {a.readCount}
                      </span>
                    )}
                    {canManage && (() => {
                      const targets = parseVisibleRoles(a.visibleRoles ?? null)
                      return targets ? (
                        <span className="flex items-center gap-1 text-[11px] text-purple-600" title={targets.map((r) => audienceRoleLabel[r]).join(", ")}>
                          <Users className="h-3 w-3" /> {targets.length === 1 ? audienceRoleLabel[targets[0]] : `${targets.length} roles`}
                        </span>
                      ) : null
                    })()}
                    {canManage && !archivedView && a.removeAfter && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Clock className="h-3 w-3" /> Removes {formatDateISO(a.removeAfter)}
                      </span>
                    )}
                    {canManage && !archivedView && a.postOn && a.postOn > new Date() && (
                      <span className="flex items-center gap-1 text-[11px] text-amber-600 font-medium">
                        <Clock className="h-3 w-3" /> Scheduled {formatDateISO(a.postOn)}
                      </span>
                    )}
                    {archivedView && a.archivedAt && (
                      <span className="flex items-center gap-1 text-[11px] text-gray-400">
                        <Archive className="h-3 w-3" /> Archived {formatDateISO(a.archivedAt)}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedId(expandedId === a.id ? null : a.id)}
                      className="flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
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
                <div className="flex items-center gap-0.5 shrink-0">
                  <NewAnnouncementDialog
                    existing={{
                      id: a.id,
                      title: a.title,
                      content: a.content,
                      visibleRoles: a.visibleRoles ?? null,
                      removeAfter: a.removeAfter ?? null,
                      postOn: a.postOn ?? null,
                    }}
                  />
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={removingId === a.id}
                    title={archivedView ? "Restore" : "Archive"}
                    className={
                      archivedView
                        ? "text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50 p-1"
                        : "text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50 p-1"
                    }
                  >
                    {archivedView ? <ArchiveRestore className="h-3.5 w-3.5" /> : <Trash2 className="h-3.5 w-3.5" />}
                  </button>
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
