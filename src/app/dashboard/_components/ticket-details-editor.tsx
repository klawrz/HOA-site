"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Pencil } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { editTicketDetails } from "@/app/actions/tickets"

export function TicketDetailsEditor({
  ticketId,
  title,
  description,
  canEdit,
  clampDescription = false,
}: {
  ticketId: string
  title: string
  description: string
  canEdit: boolean
  clampDescription?: boolean
}) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [titleInput, setTitleInput] = useState(title)
  const [descInput, setDescInput] = useState(description)

  async function handleSave() {
    const nextTitle = titleInput.trim()
    const nextDesc = descInput.trim()
    if (!nextTitle || !nextDesc) {
      toast.error("Title and description are both required")
      return
    }
    setBusy(true)
    const res = await editTicketDetails(ticketId, { title: nextTitle, description: nextDesc })
    setBusy(false)
    if (res.success) {
      toast.success("Ticket updated")
      setEditing(false)
      router.refresh()
    } else {
      toast.error(res.error || "Couldn't update ticket")
    }
  }

  function handleCancel() {
    setTitleInput(title)
    setDescInput(description)
    setEditing(false)
  }

  if (editing) {
    return (
      <div className="space-y-2 rounded-lg border p-2">
        <Input
          value={titleInput}
          onChange={(e) => setTitleInput(e.target.value)}
          placeholder="Issue title"
          className="text-sm font-semibold"
        />
        <Textarea
          value={descInput}
          onChange={(e) => setDescInput(e.target.value)}
          placeholder="Describe the issue in detail..."
          className="h-24 resize-none text-sm"
        />
        <div className="flex gap-1.5">
          <Button size="sm" className="h-7 text-xs" disabled={busy} onClick={handleSave}>
            {busy ? "Saving..." : "Save"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs"
            disabled={busy}
            onClick={handleCancel}
          >
            Cancel
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="group">
      <p className="font-semibold">
        {title}
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-2 inline-flex items-center align-middle text-gray-400 opacity-0 transition-opacity hover:text-gray-600 focus:opacity-100 group-hover:opacity-100"
            aria-label="Edit ticket details"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </p>
      <p className={`text-sm text-gray-500 mt-0.5${clampDescription ? " line-clamp-2" : ""}`}>
        {description}
      </p>
    </div>
  )
}
