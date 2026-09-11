import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData, getOwnerProxyLetters } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { AgmPacketDocument } from "@/components/agm/docs/agm-packet-document"
import { AgmLitePacketDocument } from "@/components/agm/docs/agm-lite-packet-document"
import { ProxyLetterBody } from "@/components/agm/docs/proxy-letter-body"

// The owner's own AGM package: the shared informative package followed by
// their pre-filled proxy letters for each villa they own. One PDF. Which
// package (full or the lighter summary) depends on each owned unit's own
// "AGM package" preference, set from the unit page - defaults to the
// summary. An owner with multiple villas set differently gets the fuller
// of the two rather than silently dropping detail someone asked for.
export default async function OwnerAgmPacketPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>
}) {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "OWNER")) redirect("/dashboard")
  const orgId = session.user.orgId ?? ""
  const { unit } = await searchParams

  const privileged =
    session.user.role === "ACCOUNT_OWNER" || session.user.isBoardMember === true
  const [data, proxy, ownedUnits] = await Promise.all([
    getAgmPacketData(orgId),
    getOwnerProxyLetters(orgId, session.user.id, { unitId: unit, privileged }),
    db.unit.findMany({
      where: { orgId, ownerships: { some: { isCurrent: true, ownerId: session.user.id } } },
      select: { agmDocumentPreference: true },
    }),
  ])
  if (!data) redirect("/dashboard/owner/governance/agm")

  const wantsFull = ownedUnits.some((u) => u.agmDocumentPreference === "FULL")
  const proxyStartNum = wantsFull ? 5 : 1

  return (
    <PrintDocShell
      title={`Your AGM ${data.agm.year} package`}
      subtitle="Everything for the meeting plus your pre-filled proxy letters. You can come back to your unit and grab this any time."
      backHref="/dashboard/owner/governance/agm"
    >
      {wantsFull ? <AgmPacketDocument data={data} /> : <AgmLitePacketDocument data={data} />}
      {proxy?.villas.map((v, vi) =>
        v.letters.map((l, li) => (
          <section
            key={`${v.label}-${li}`}
            className="break-before-page bg-white p-8 print:p-0"
          >
            <p className="pk-divider">
              <span className="pk-divider-num">{proxyStartNum + vi}</span>
              <span>
                <span className="pk-divider-es block">Carta poder — {v.label}</span>
                <span className="pk-divider-en block">Proxy letter — {v.label}</span>
              </span>
            </p>
            <ProxyLetterBody letter={l} granterNames={v.granterNames} />
          </section>
        ))
      )}
    </PrintDocShell>
  )
}
