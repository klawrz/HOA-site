import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { AgmPacketDocument } from "@/components/agm/docs/agm-packet-document"

// The full AGM informative package as one document - cover page, cover
// letter, both convocatorias, and the dues schedule, page-broken so
// "Print / Save as PDF" produces a single file. The financial report and
// proposed budget stay as their own attachments (listed on the cover).
export default async function AgmPacketPage() {
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
      title={`AGM ${data.agm.year} — detailed package`}
      subtitle="Cover letter, both convocatorias and the dues schedule in one file. The financial report and proposed budget are attached separately."
      backHref="/dashboard/board/agm"
    >
      <AgmPacketDocument data={data} />
    </PrintDocShell>
  )
}
