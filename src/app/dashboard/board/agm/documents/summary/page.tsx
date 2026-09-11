import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { AgmLitePacketDocument } from "@/components/agm/docs/agm-lite-packet-document"

// The "lite" AGM package - a plain-language summary up front, then both
// required convocatorias in full, then a collapsed (total-only) dues
// figure. For owners who want the essentials without the full package's
// level of detail (Board feedback, 2026-09-11).
export default async function AgmLitePacketPage() {
  const session = await auth()
  const canManage =
    session?.user &&
    (canPreviewRole(session.user.role, "BOARD_MEMBER") ||
      canPreviewRole(session.user.role, "PROPERTY_MANAGER") ||
      session.user.isBoardMember === true)
  if (!session || !canManage) redirect("/dashboard")

  const data = await getAgmPacketData(session.user.orgId ?? "")
  if (!data) redirect("/dashboard/board/agm")

  return (
    <PrintDocShell
      title={`AGM ${data.agm.year} — summary package`}
      subtitle="The essentials, both convocatorias, and a collapsed dues total - a shorter alternative to the full informative package."
      backHref="/dashboard/board/agm"
    >
      <AgmLitePacketDocument data={data} />
    </PrintDocShell>
  )
}
