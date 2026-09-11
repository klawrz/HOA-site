import type { AgmTrackKind } from "@/generated/prisma"

// The printable body of one convocatoria - the editable narrative, then the
// bilingual ORDEN DEL DÍA / AGENDA columns, then the signature block.
// Shared by the standalone convocatoria route and the combined AGM packet.

export type ConvocatoriaBodyItem = {
  id: string
  numeral: string | null
  titleEs: string
  titleEn: string
  isExtraordinary: boolean
}

export function ConvocatoriaBody({
  kind,
  bodyEs,
  bodyEn,
  items,
  noticeDateLabel,
  signatories,
}: {
  kind: AgmTrackKind
  bodyEs: string
  bodyEn: string
  items: ConvocatoriaBodyItem[]
  noticeDateLabel: string
  signatories: string[]
}) {
  const list = signatories.length ? signatories : ["___"]
  return (
    <div className="text-[13px] leading-relaxed">
      <p className="text-center text-xs uppercase tracking-wide text-gray-400 mb-3">
        {kind === "REGIME" ? "Régimen de Propiedad en Condominio" : "Asociación Civil"}
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <p className="whitespace-pre-line md:border-r md:pr-6 print:border-r">{bodyEs}</p>
        <p className="whitespace-pre-line">{bodyEn}</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-6">
        <div>
          <p className="font-semibold text-center mb-2">ORDEN DEL DÍA</p>
          <ol className="space-y-1.5">
            {items.map((it, i) => (
              <li key={it.id} className="flex gap-2">
                <span className="font-semibold w-10 shrink-0">{it.numeral || `${i + 1}.`}</span>
                <span>
                  {it.titleEs}
                  {it.isExtraordinary && <em className="text-gray-500"> (asunto extraordinario)</em>}
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <p className="font-semibold text-center mb-2">AGENDA</p>
          <ol className="space-y-1.5">
            {items.map((it, i) => (
              <li key={it.id} className="flex gap-2">
                <span className="font-semibold w-10 shrink-0">{it.numeral || `${i + 1}.`}</span>
                <span>
                  {it.titleEn}
                  {it.isExtraordinary && <em className="text-gray-500"> (extraordinary matter)</em>}
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      <div className="mt-12 text-center text-[12px]">
        <p>{noticeDateLabel}</p>
        <p className="mt-2 font-medium">Asociación de Condóminos Sampaguita Villas A.C.</p>
        <div
          className="mt-12 grid gap-x-10 gap-y-10 mx-auto"
          style={{ gridTemplateColumns: `repeat(${Math.min(list.length, 2)}, minmax(0, 16rem))` }}
        >
          {list.map((name, i) => (
            <div key={i} className="border-t border-gray-400 pt-1">
              <p className="font-medium">{name}</p>
              <p className="text-gray-500">Consejo Directivo / Board of Directors</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
