import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { ConvocatoriaBody } from "@/components/agm/docs/convocatoria-body"
import { DuesTableBody } from "@/components/agm/docs/dues-table-body"
import { CoverLetterBody } from "@/components/agm/docs/cover-letter-body"

// The full AGM informative package as one document - cover letter, both
// convocatorias, and the dues schedule, page-broken so "Print / Save as
// PDF" produces a single file. The financial report and proposed budget
// stay as their own attachments (linked, not re-rendered).
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

  const Section = ({ children }: { children: React.ReactNode }) => (
    <section className="bg-white border rounded-xl p-8 print:border-0 print:rounded-none print:p-0 print:break-after-page">
      {children}
    </section>
  )

  return (
    <PrintDocShell
      title={`AGM ${data.agm.year} — informative package`}
      subtitle="Cover letter, both convocatorias and the dues schedule in one file. Attach the financial report and proposed budget separately."
      backHref="/dashboard/board/agm"
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

        <section className="bg-white border rounded-xl p-8 print:border-0 print:rounded-none print:p-0">
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
          <div className="mt-8 pt-4 border-t text-xs text-gray-500 print:hidden">
            <p className="font-medium text-gray-600">Attach separately to the package:</p>
            <ul className="list-disc pl-5 mt-1 space-y-0.5">
              <li>
                Financial report — file it from{" "}
                <a href="/dashboard/board/reports/financial" className="text-blue-600 hover:underline">
                  Reports → Financial
                </a>
              </li>
              <li>
                Proposed {data.dues.fyLabel} budget — from{" "}
                <a href="/dashboard/board/finances" className="text-blue-600 hover:underline">
                  Finances
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </PrintDocShell>
  )
}
