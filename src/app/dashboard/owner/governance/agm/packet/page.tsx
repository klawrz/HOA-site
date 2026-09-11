import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData, getOwnerProxyLetters } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { ConvocatoriaBody } from "@/components/agm/docs/convocatoria-body"
import { DuesTableBody } from "@/components/agm/docs/dues-table-body"
import { CoverLetterBody } from "@/components/agm/docs/cover-letter-body"
import { ProxyLetterBody } from "@/components/agm/docs/proxy-letter-body"

// The owner's own AGM package: the shared informative package (cover
// letter, both convocatorias, dues schedule) followed by their pre-filled
// proxy letters for each villa they own. One "Print / Save as PDF".
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
  const [data, proxy] = await Promise.all([
    getAgmPacketData(orgId),
    getOwnerProxyLetters(orgId, session.user.id, { unitId: unit, privileged }),
  ])
  if (!data) redirect("/dashboard/owner/governance/agm")

  const Section = ({
    children,
    last,
  }: {
    children: React.ReactNode
    last?: boolean
  }) => (
    <section
      className={`bg-white border rounded-xl p-8 print:border-0 print:rounded-none print:p-0 ${
        last ? "" : "print:break-after-page"
      }`}
    >
      {children}
    </section>
  )

  return (
    <PrintDocShell
      title={`Your AGM ${data.agm.year} package`}
      subtitle="Everything for the meeting plus your pre-filled proxy letters. You can come back to your unit and grab this any time."
      backHref="/dashboard/owner/governance/agm"
    >
      <div className="space-y-6 print:space-y-0">
        <Section>
          <CoverLetterBody
            subject={data.email.subject}
            bodyEs={data.email.bodyEs}
            bodyEn={data.email.bodyEn}
            zoomInfo={data.agm.zoomInfo}
          />
        </Section>

        {data.tracks.map((t) => (
          <Section key={t.kind}>
            <ConvocatoriaBody
              kind={t.kind}
              bodyEs={t.bodyEs}
              bodyEn={t.bodyEn}
              items={t.items}
              noticeDateLabel={data.noticeDateLabel}
              signatories={data.signatories}
            />
          </Section>
        ))}

        <Section last={!proxy}>
          <DuesTableBody
            fyLabel={data.dues.fyLabel}
            unitLabel={data.dues.unitLabel}
            currency={data.dues.currency}
            totalFormatted={data.dues.totalFormatted}
            rows={data.dues.rows}
            totalPct={data.dues.totalPct}
            totalAnnual={data.dues.totalAnnual}
            sourceNote={data.dues.sourceNote}
          />
        </Section>

        {proxy?.villas.map((v, vi) =>
          v.letters.map((l, li) => {
            const isLast = vi === proxy.villas.length - 1 && li === v.letters.length - 1
            return (
              <Section key={`${v.label}-${li}`} last={isLast}>
                <p className="text-center text-xs uppercase tracking-wide text-gray-400 mb-3">
                  Carta poder / Proxy letter — {v.label}
                </p>
                <ProxyLetterBody letter={l} granterNames={v.granterNames} />
              </Section>
            )
          })
        )}
      </div>
    </PrintDocShell>
  )
}
