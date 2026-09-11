import type { getAgmPacketData } from "@/lib/agm"
import { ConvocatoriaBody } from "./convocatoria-body"
import { DuesTableBody } from "./dues-table-body"
import { CoverLetterBody } from "./cover-letter-body"

type PacketData = NonNullable<Awaited<ReturnType<typeof getAgmPacketData>>>

// Executive layout for the combined AGM package: a cover page, numbered
// bilingual section dividers, and a running header/footer. Print-first
// (A4, generous margins). Used by both the in-app packet route and the
// headless-Chrome PDF render.
export function AgmPacketDocument({ data }: { data: PacketData }) {
  const contents = [
    { n: 1, es: "Carta de presentación", en: "Cover letter" },
    { n: 2, es: "Convocatoria — Asamblea General Anual Ordinaria (Régimen)", en: "Call notice — General Annual Ordinary Meeting (Regime)" },
    { n: 3, es: "Convocatoria — Asamblea General de Asociados (Asociación Civil)", en: "Call notice — Annual General Associates Meeting (Civil Association)" },
    { n: 4, es: `Cuotas ${data.dues.fyLabel} — calendario trimestral`, en: `${data.dues.fyLabel} dues — quarterly schedule` },
  ]
  const trackByKind = Object.fromEntries(data.tracks.map((t) => [t.kind, t]))

  const Divider = ({ n, es, en }: { n: number; es: string; en: string }) => (
    <div className="pk-divider">
      <span className="pk-divider-num">{n}</span>
      <div>
        <p className="pk-divider-es">{es}</p>
        <p className="pk-divider-en">{en}</p>
      </div>
    </div>
  )

  return (
    <>
      <style>{PACKET_CSS}</style>

      <div className="pk">
        {/* ---- Cover page ---- */}
        <section className="pk-cover">
          <p className="pk-org">ASOCIACIÓN DE CONDÓMINOS SAMPAGUITA VILLAS A.C.</p>
          <div className="pk-rule" />
          <h1 className="pk-title">
            Reunión General Anual {data.agm.year}
            <span className="pk-title-sub">{data.agm.year} Annual General Meeting</span>
          </h1>
          <p className="pk-kicker">Paquete Informativo · Informative Package</p>

          <table className="pk-meta">
            <tbody>
              <tr>
                <th>Fecha / Date</th>
                <td>{coverDate(data)}</td>
              </tr>
              {data.agm.location && (
                <tr>
                  <th>Lugar / Venue</th>
                  <td>{data.agm.location}</td>
                </tr>
              )}
              {data.agm.callTimes && (
                <tr>
                  <th>Convocatorias / Calls</th>
                  <td>{data.agm.callTimes}</td>
                </tr>
              )}
              <tr>
                <th>Emitido / Issued</th>
                <td>{data.noticeDateLabel}</td>
              </tr>
            </tbody>
          </table>

          <div className="pk-contents">
            <p className="pk-contents-h">Contenido / Contents</p>
            <ol>
              {contents.map((c) => (
                <li key={c.n}>
                  <span className="pk-c-es">{c.es}</span>
                  <span className="pk-c-en">{c.en}</span>
                </li>
              ))}
            </ol>
            <p className="pk-contents-note">
              Se adjuntan por separado / Attached separately: Reporte financiero {data.agm.year} ·
              Propuesta de presupuesto {data.dues.fyLabel} · Cartas poder (una por propietario /
              proxy letters, one set per owner).
            </p>
          </div>

          {data.signatories.length > 0 && (
            <p className="pk-cover-sign">
              {data.signatories.join(" · ")} — Consejo Directivo / Board of Directors
            </p>
          )}
        </section>

        {/* ---- 1. Cover letter ---- */}
        <section className="pk-section">
          <Divider n={1} es={contents[0].es} en={contents[0].en} />
          <CoverLetterBody
            subject={data.email.subject}
            bodyEs={data.email.bodyEs}
            bodyEn={data.email.bodyEn}
            zoomInfo={data.agm.zoomInfo}
          />
        </section>

        {/* ---- 2. Regime convocatoria ---- */}
        {trackByKind.REGIME && (
          <section className="pk-section">
            <Divider n={2} es={contents[1].es} en={contents[1].en} />
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

        {/* ---- 3. Civil Association convocatoria ---- */}
        {trackByKind.CIVIL_ASSOCIATION && (
          <section className="pk-section">
            <Divider n={3} es={contents[2].es} en={contents[2].en} />
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

        {/* ---- 4. Dues ---- */}
        <section className="pk-section pk-last">
          <Divider n={4} es={contents[3].es} en={contents[3].en} />
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
        </section>
      </div>
    </>
  )
}

function coverDate(data: PacketData): string {
  const d = new Date(data.agm.dateISO)
  const es = d.toLocaleDateString("es-MX", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  const en = d.toLocaleDateString("en-US", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
  return `${cap(es)} / ${en}`
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

const PACKET_CSS = `
  @page { size: A4; margin: 18mm 18mm 16mm; }
  html, body { background:#fff !important; }
  .pk { color:#0f172a; font-size:10.5pt; line-height:1.55; background:#fff; }
  @media screen {
    .pk { max-width: 190mm; margin:24px auto; padding:24px; box-shadow:0 1px 12px rgba(0,0,0,.08); }
  }

  .pk-cover { text-align:center; padding:16mm 0 0; break-after:page; }
  .pk-org { font-size:9pt; letter-spacing:.18em; font-weight:600; color:#334155; margin:0; }
  .pk-rule { width:64px; height:2px; background:#1e293b; margin:14px auto 20px; }
  .pk-title { font-size:26pt; font-weight:700; line-height:1.15; margin:0; color:#0f172a; }
  .pk-title-sub { display:block; font-size:13pt; font-weight:500; color:#64748b; margin-top:4px; }
  .pk-kicker { font-size:11pt; color:#475569; letter-spacing:.06em; margin:10px 0 26px; text-transform:uppercase; }

  .pk-meta { margin:0 auto 26px; border-collapse:collapse; text-align:left; }
  .pk-meta th { padding:5px 16px 5px 0; font-size:8.5pt; text-transform:uppercase; letter-spacing:.06em; color:#94a3b8; vertical-align:top; white-space:nowrap; }
  .pk-meta td { padding:5px 0; font-size:10pt; color:#1e293b; }

  .pk-contents { margin:0 auto; max-width:150mm; text-align:left; border-top:1px solid #e2e8f0; border-bottom:1px solid #e2e8f0; padding:16px 0; }
  .pk-contents-h { font-size:8.5pt; text-transform:uppercase; letter-spacing:.08em; color:#94a3b8; margin:0 0 8px; }
  .pk-contents ol { margin:0; padding-left:22px; }
  .pk-contents li { margin:6px 0; }
  .pk-c-es { display:block; font-size:10pt; color:#0f172a; }
  .pk-c-en { display:block; font-size:8.5pt; color:#64748b; }
  .pk-contents-note { font-size:8pt; color:#94a3b8; margin:12px 0 0; }
  .pk-cover-sign { margin-top:30px; font-size:9pt; color:#475569; }

  .pk-section { break-before:page; }
  .pk-section:first-of-type { break-before:auto; }
  .pk-last { break-after:auto; }
  .pk-divider { display:flex; align-items:center; gap:14px; border-bottom:2px solid #1e293b; padding-bottom:8px; margin-bottom:20px; }
  .pk-divider-num { font-size:22pt; font-weight:700; color:#cbd5e1; line-height:1; }
  .pk-divider-es { margin:0; font-size:12pt; font-weight:700; color:#0f172a; }
  .pk-divider-en { margin:0; font-size:9pt; color:#64748b; }

  /* force the real bilingual 2-column layout for the convocatoria body and
     its agenda (the md: breakpoint isn't reliably hit in print) */
  .pk .grid.md\\:grid-cols-2 { display:grid !important; grid-template-columns:1fr 1fr; gap:1.5rem; }
  .pk .grid.md\\:grid-cols-2 > *:first-child { border-right:1px solid #e2e8f0; padding-right:1.5rem; }
`
