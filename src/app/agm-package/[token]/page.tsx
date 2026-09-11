import { notFound } from "next/navigation"
import { resolveAgmPackageLink, getAgmPacketData, getOwnerProxyLetters } from "@/lib/agm"
import { AgmPacketDocument } from "@/components/agm/docs/agm-packet-document"
import { AgmLitePacketDocument } from "@/components/agm/docs/agm-lite-packet-document"
import { ProxyLetterBody } from "@/components/agm/docs/proxy-letter-body"
import { PrintButton } from "@/components/agm/print-button"

// Public, unauthenticated - the unguessable token is the sole credential,
// same shape as the occupancy share-link flow. Scoped to exactly one
// unit's own AGM package (their preferred summary/detailed doc + their
// pre-filled proxy letters) - nothing else on HOPE is reachable from here.
// This is the link the Board's "send the call" issues to every owner.
export default async function AgmPackageLinkPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const resolved = await resolveAgmPackageLink(token)
  if (!resolved) notFound()

  const [data, proxy] = await Promise.all([
    getAgmPacketData(resolved.orgId),
    getOwnerProxyLetters(resolved.orgId, undefined, { unitId: resolved.unitId, privileged: true }),
  ])
  if (!data) notFound()

  const proxyStartNum = resolved.wantsFull ? 5 : 1

  return (
    <div className="max-w-3xl mx-auto p-6 print:p-0 space-y-6 text-gray-900">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-xl font-bold">
            Your AGM {data.agm.year} package — {resolved.wantsFull ? "detailed" : "summary"}
          </h1>
          <p className="text-sm text-gray-500">
            Sent by the Board for the Annual General Meeting. Includes your pre-filled proxy letters.
          </p>
        </div>
        <PrintButton />
      </div>
      {resolved.wantsFull ? <AgmPacketDocument data={data} /> : <AgmLitePacketDocument data={data} />}
      {proxy?.villas.map((v, vi) =>
        v.letters.map((l, li) => (
          <section key={`${v.label}-${li}`} className="break-before-page bg-white p-8 print:p-0">
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
    </div>
  )
}
