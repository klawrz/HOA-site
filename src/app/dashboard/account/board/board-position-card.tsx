"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { deleteBoardPosition } from "@/app/actions/board-positions"
import { BoardPositionDialog } from "./board-position-dialog"
import { formatDateISO } from "@/lib/utils"

interface Member {
  id: string
  name: string | null
  email: string
}

interface PositionRow {
  id: string
  title: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  termStart: Date
  termEnd: Date | null
  notes: string | null
}

export function BoardPositionCard({ position, members }: { position: PositionRow; members: Member[] }) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    setRemoving(true)
    const result = await deleteBoardPosition(position.id)
    setRemoving(false)
    if (!result.success) toast.error("Failed to remove position")
  }

  return (
    <div className="border rounded-lg p-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium">
            {position.title}
            <span className="text-gray-400 font-normal">
              {" "}
              — {position.userName ?? position.userEmail ?? "Vacant"}
            </span>
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {formatDateISO(position.termStart)}
            {position.termEnd ? ` – ${formatDateISO(position.termEnd)}` : " – present"}
          </p>
          {position.notes && <p className="text-xs text-gray-500 mt-1">{position.notes}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <BoardPositionDialog
            members={members}
            position={{
              id: position.id,
              title: position.title,
              userId: position.userId,
              termStart: position.termStart,
              termEnd: position.termEnd,
              notes: position.notes,
            }}
          />
          <button
            onClick={handleRemove}
            disabled={removing}
            className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
