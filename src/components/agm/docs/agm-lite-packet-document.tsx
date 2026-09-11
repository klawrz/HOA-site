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
// not something a "lite" version can cut.
export function AgmLitePacketDocument({ data }: { data: PacketData }) {
  const trackByKind = Object.fromEntries(data.tracks.map((t) => [t.kind, t]))

  return (
    <>
      <style>{PACKET_CSS}</style>

      <div className="pk">
        <section className="pk-section">
          <p className="pk-org">ASOCIACIÓN DE CONDÓMINOS SAMPAGUITA VILLAS A.C.</p>
          <p className="pk-lite-title">
            Reunión General Anual {data.agm.year} — Resumen
            <span className="pk-title-sub">{data.agm.year} Annual General Meeting — Summary</span>
          </p>
          <AtAGlanceBody data={data} />
        </section>

        {trackByKind.REGIME && (
          <section className="pk-section">
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
          </section>
        )}

        {trackByKind.CIVIL_ASSOCIATION && (
          <section className="pk-section">
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
          </section>
        )}

        <section className="pk-section pk-last">
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
          {data.signatories.length > 0 && (
            <p className="pk-cover-sign" style={{ textAlign: "center", marginTop: "24px" }}>
              {data.signatories.join(" · ")} — Consejo Directivo / Board of Directors
            </p>
          )}
        </section>
      </div>
    </>
  )
}
