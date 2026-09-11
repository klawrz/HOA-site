import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { DuesTableBody } from "@/components/agm/docs/dues-table-body"

export default async function DuesTablePage() {
  const session = await auth()
  const canManage =
    session?.user &&
    (canPreviewRole(session.user.role, "BOARD_MEMBER") ||
      canPreviewRole(session.user.role, "PROPERTY_MANAGER") ||
      session.user.isBoardMember === true)
  if (!session || !canManage) redirect("/dashboard")

  const data = await getAgmPacketData(session.user.orgId ?? "")
  if (!data) redirect("/dashboard/board/agm")
  const d = data.dues

  return (
    <PrintDocShell
      title={`Dues ${d.fyLabel} — per ${d.unitLabel.toLowerCase()} quarterly schedule`}
      subtitle={d.sourceNote}
      backHref="/dashboard/board/agm"
    >
      <article className="bg-white border rounded-xl p-6 print:border-0 print:rounded-none print:p-0">
        <DuesTableBody
          fyLabel={d.fyLabel}
          unitLabel={d.unitLabel}
          currency={d.currency}
          totalFormatted={d.totalFormatted}
          rows={d.rows}
          totalPct={d.totalPct}
          totalAnnual={d.totalAnnual}
          sourceNote={d.sourceNote}
        />
      </article>
    </PrintDocShell>
  )
}
