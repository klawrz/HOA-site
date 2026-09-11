import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { canPreviewRole } from "@/lib/role-access"
import { getOwnerProxyLetters } from "@/lib/agm"
import { PrintDocShell } from "@/components/agm/print-doc-shell"
import { ProxyLetterBody } from "@/components/agm/docs/proxy-letter-body"

// Print-ready, pre-filled bilingual proxy letters - the owner opens this
// from the RSVP dialog, prints it, fills in their representative, signs
// both language sides plus the witness lines, scans it, and uploads it
// back. With no ?unit it covers every villa the owner holds.
export default async function OwnerProxyLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>
}) {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "OWNER")) redirect("/dashboard")
  const { unit } = await searchParams

  const privileged =
    session.user.role === "ACCOUNT_OWNER" || session.user.isBoardMember === true
  const proxy = await getOwnerProxyLetters(session.user.orgId ?? "", session.user.id, {
    unitId: unit,
    privileged,
  })
  if (!proxy) redirect("/dashboard/owner/governance/agm")

  return (
    <PrintDocShell
      title="Your proxy letters"
      subtitle="One page per assembly. Print, appoint your representative, and sign the Spanish and English columns plus the witness lines."
      backHref="/dashboard/owner/governance/agm"
    >
      <div className="space-y-6 print:space-y-0">
        {proxy.villas.map((v, vi) =>
          v.letters.map((l, li) => {
            const isLast = vi === proxy.villas.length - 1 && li === v.letters.length - 1
            return (
              <article
                key={`${v.label}-${li}`}
                className={`bg-white border rounded-xl p-6 print:border-0 print:rounded-none print:p-0 ${
                  isLast ? "" : "print:break-after-page"
                }`}
              >
                <p className="text-center text-xs uppercase tracking-wide text-gray-400 mb-3">
                  {v.label}
                </p>
                <ProxyLetterBody letter={l} granterNames={v.granterNames} />
              </article>
            )
          })
        )}
      </div>
    </PrintDocShell>
  )
}
