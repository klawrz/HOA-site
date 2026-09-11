import type { getAgmPacketData } from "@/lib/agm"
import { ConvocatoriaBody } from "./convocatoria-body"
import { DuesTableBody } from "./dues-table-body"
import { AtAGlanceBody } from "./at-a-glance-body"
import { PACKET_CSS } from "./agm-packet-document"

type PacketData = NonNullable<Awaited<ReturnType<typeof getAgmPacketData>>>

// The "lite" AGM package (Board feedback, 2026-09-11: the full package is
// "impressive detail however maybe too much for the average homeowner").
// Drops the long-form cover-letter narrative and collapses the per-unit
// dues table to a single total, but keeps the two convocatorias in full -
// those are the actual legally required notice + agenda for each meeting,
// not something a "lite" version can cut. Which sections actually appear -
// and their inventory number/revision - comes from data.inventory, same
// manifest the full package reads (see AgmDocumentItem).
export function AgmLitePacketDocument({ data }: { data: PacketData }) {
  const included = (key: string) => data.inventory.sectionIncluded(key, "summary")
  const trackByKind = Object.fromEntries(data.tracks.map((t) => [t.kind, t]))

  // Whichever section actually ends up last gets the closing note - avoids
  // an extra near-blank page if e.g. Dues is excluded from this package.
  const order = [
    "at-a-glance",
    trackByKind.REGIME && "convocatoria-regime",
    trackByKind.CIVIL_ASSOCIATION && "convocatoria-civil",
    "dues",
  ].filter((k): k is string => !!k && included(k))
  const lastKey = order[order.length - 1]

  const DocTag = ({ docKey }: { docKey: string }) => {
    const t = data.inventory.sectionTag(docKey)
    return t ? <p className="pk-doctag">{t}</p> : null
  }

  const Closing = () =>
    data.inventory.attachmentsSummary.length > 0 || data.signatories.length > 0 ? (
      <>
        {data.inventory.attachmentsSummary.length > 0 && (
          <p className="pk-contents-note" style={{ textAlign: "center", marginTop: "16px" }}>
            Se adjuntan por separado / Attached separately:{" "}
            {data.inventory.attachmentsSummary
              .map((a) => `${a.title} (#${a.number} · Rev ${a.revision})`)
              .join(" · ")}
          </p>
        )}
        {data.signatories.length > 0 && (
          <p className="pk-cover-sign" style={{ textAlign: "center", marginTop: "12px" }}>
            {data.signatories.join(" · ")} — Consejo Directivo / Board of Directors
          </p>
        )}
      </>
    ) : null

  return (
    <>
      <style>{PACKET_CSS}</style>

      <div className="pk">
        {included("at-a-glance") && (
          <section className={`pk-section${lastKey === "at-a-glance" ? " pk-last" : ""}`}>
            <p className="pk-org">ASOCIACIÓN DE CONDÓMINOS SAMPAGUITA VILLAS A.C.</p>
            <p className="pk-lite-title">
              Reunión General Anual {data.agm.year}
              <span className="pk-title-sub">{data.agm.year} Annual General Meeting</span>
            </p>
            <p className="pk-kicker" style={{ textAlign: "center", marginBottom: "16px" }}>
              Paquete Resumen · Summary Package
            </p>
            <AtAGlanceBody data={data} />
            <DocTag docKey="at-a-glance" />
            {lastKey === "at-a-glance" && <Closing />}
          </section>
        )}

        {trackByKind.REGIME && included("convocatoria-regime") && (
          <section className={`pk-section${lastKey === "convocatoria-regime" ? " pk-last" : ""}`}>
            <div className="pk-divider">
              <div>
                <p className="pk-divider-es">Convocatoria — Régimen</p>
                <p className="pk-divider-en">Call notice — Regime</p>
              </div>
            </div>
            <ConvocatoriaBody
              kind="REGIME"
              bodyEs={trackByKind.REGIME.bodyEs}
              bodyEn={trackByKind.REGIME.bodyEn}
              items={trackByKind.REGIME.items}
              noticeDateLabel={data.noticeDateLabel}
              signatories={data.signatories}
            />
            <DocTag docKey="convocatoria-regime" />
            {lastKey === "convocatoria-regime" && <Closing />}
          </section>
        )}

        {trackByKind.CIVIL_ASSOCIATION && included("convocatoria-civil") && (
          <section className={`pk-section${lastKey === "convocatoria-civil" ? " pk-last" : ""}`}>
            <div className="pk-divider">
              <div>
                <p className="pk-divider-es">Convocatoria — Asociación Civil</p>
                <p className="pk-divider-en">Call notice — Civil Association</p>
              </div>
            </div>
            <ConvocatoriaBody
              kind="CIVIL_ASSOCIATION"
              bodyEs={trackByKind.CIVIL_ASSOCIATION.bodyEs}
              bodyEn={trackByKind.CIVIL_ASSOCIATION.bodyEn}
              items={trackByKind.CIVIL_ASSOCIATION.items}
              noticeDateLabel={data.noticeDateLabel}
              signatories={data.signatories}
            />
            <DocTag docKey="convocatoria-civil" />
            {lastKey === "convocatoria-civil" && <Closing />}
          </section>
        )}

        {included("dues") && (
          <section className={`pk-section${lastKey === "dues" ? " pk-last" : ""}`}>
            <div className="pk-divider">
              <div>
                <p className="pk-divider-es">Cuotas {data.dues.fyLabel}</p>
                <p className="pk-divider-en">{data.dues.fyLabel} Dues</p>
              </div>
            </div>
            <DuesTableBody
              fyLabel={data.dues.fyLabel}
              unitLabel={data.dues.unitLabel}
              currency={data.dues.currency}
              totalFormatted={data.dues.totalFormatted}
              rows={data.dues.rows}
              totalPct={data.dues.totalPct}
              totalAnnual={data.dues.totalAnnual}
              sourceNote={data.dues.sourceNote}
              collapsed
            />
            <DocTag docKey="dues" />
            {lastKey === "dues" && <Closing />}
          </section>
        )}
      </div>
    </>
  )
}
