import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getBoardPriorityTileData } from "@/lib/board-priority-tiles"
import { BoardPriorityTiles } from "@/components/board/priority-tiles"

// Wraps every Board page (not just the home page) with the coloured
// priority-tile row - same pattern as the Owner and PM section layouts.
// Per Dara: the five tiles (Finances / Property Management / Units /
// Employees / AGM) need to be across the top of every Board page for
// instant access, not only where you land. Scaffolding to force content
// coverage across roles, not final UX. auth()/redirect duplicates each
// page's own guard, which is the cheap, correct way to keep the layout
// safe even if a future page under this route forgets its own.
export default async function BoardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  const data = session.user.orgId ? await getBoardPriorityTileData(session.user.orgId) : null

  return (
    <div className="space-y-4">
      {data && <BoardPriorityTiles data={data} />}
      {children}
    </div>
  )
}
