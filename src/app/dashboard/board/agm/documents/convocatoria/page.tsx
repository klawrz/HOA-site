import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { ConvocatoriaBody } from "@/components/agm/docs/convocatoria-body"
import type { AgmTrackKind } from "@/generated/prisma"

export default async function ConvocatoriaPage({
  searchParams,
}: {
  searchParams: Promise<{ track?: string }>
}) {
  const session = await auth()
  const canManage =
    session?.user &&
    (canPreviewRole(session.user.role, "BOARD_MEMBER") ||
      canPreviewRole(session.user.role, "PROPERTY_MANAGER") ||
      session.user.isBoardMember === true)
  if (!session || !canManage) redirect("/dashboard")

  const { track: trackParam } = await searchParams
  const kind: AgmTrackKind = trackParam === "CIVIL_ASSOCIATION" ? "CIVIL_ASSOCIATION" : "REGIME"

  const data = await getAgmPacketData(session.user.orgId ?? "")
  const track = data?.tracks.find((t) => t.kind === kind)
  if (!data || !track) redirect("/dashboard/board/agm")

  return (
    <PrintDocShell
      title={`Convocatoria — ${kind === "REGIME" ? "Condominium Regime" : "Civil Association"}`}
      subtitle="Edit the text from the AGM's agenda tab. Then Print / Save as PDF for the informative package."
      backHref="/dashboard/board/agm"
    >
      <article className="bg-white border rounded-xl p-8 print:border-0 print:rounded-none print:p-0">
        <ConvocatoriaBody
          kind={track.kind}
          bodyEs={track.bodyEs}
          bodyEn={track.bodyEn}
          items={track.items}
          noticeDateLabel={data.noticeDateLabel}
          signatories={data.signatories}
        />
      </article>
    </PrintDocShell>
  )
}
