import type { getAgmPacketData } from "@/lib/agm"

// A one-page, plain-language "read this first" summary - logistics, the
// handful of real decisions on the table (motions only, not every
// procedural agenda item), and what an owner actually needs to do. Board
// feedback (Paul Dame, 2026-09-11): the full package is "impressive detail
// however maybe too much for the average homeowner" - this page is the fix,
// used both as the new lead page of the full package and as the entire
// content of the standalone "lite" summary.

type PacketData = NonNullable<Awaited<ReturnType<typeof getAgmPacketData>>>

function fmtDeadline(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("en-US", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}
function fmtDeadlineEs(iso: string | null): string | null {
  if (!iso) return null
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  })
}

export function AtAGlanceBody({ data }: { data: PacketData }) {
  const motions = data.tracks.flatMap((t) =>
    t.items
      .filter((i) => i.kind === "MOTION")
      .map((i) => ({ ...i, trackKind: t.kind }))
  )
  const proxyDeadlineEs = fmtDeadlineEs(data.agm.proxyDeadlineISO)
  const proxyDeadlineEn = fmtDeadline(data.agm.proxyDeadlineISO)
  const rsvpDeadlineEs = fmtDeadlineEs(data.agm.rsvpDeadlineISO)
  const rsvpDeadlineEn = fmtDeadline(data.agm.rsvpDeadlineISO)

  return (
    <div className="text-[13px] leading-relaxed">
      <p className="text-center text-xs uppercase tracking-wide text-gray-400 mb-3">
        Lea esto primero / Start here
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="md:border-r md:pr-6 print:border-r space-y-4">
          <section>
            <p className="font-semibold">Cuándo y dónde</p>
            <p>
              {new Date(data.agm.dateISO).toLocaleDateString("es-MX", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
              {data.agm.callTimes && ` · ${data.agm.callTimes}`}
              {data.agm.location && ` · ${data.agm.location}`}
            </p>
          </section>

          <section>
            <p className="font-semibold">Qué se va a decidir</p>
            <ul className="list-disc pl-5 space-y-1">
              {motions.map((m) => (
                <li key={m.id}>{m.titleEs}</li>
              ))}
            </ul>
          </section>

          <section>
            <p className="font-semibold">Qué tienes que hacer</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Asiste en persona, o</li>
              <li>
                Otorga un poder (carta poder) a otro propietario, familiar o tercero
                {proxyDeadlineEs ? ` antes del ${proxyDeadlineEs}` : " antes de la asamblea"}
              </li>
              {rsvpDeadlineEs && <li>Confirma tu asistencia antes del {rsvpDeadlineEs}</li>}
              {(data.agm.proxyContactName || data.agm.proxyContactEmail) && (
                <li>
                  Envía tu poder firmado a {data.agm.proxyContactName}
                  {data.agm.proxyContactEmail && ` (${data.agm.proxyContactEmail})`}
                </li>
              )}
            </ul>
          </section>

          {data.agm.zoomInfo && (
            <section>
              <p className="font-semibold">Zoom</p>
              <p className="whitespace-pre-line">{data.agm.zoomInfo}</p>
              <p className="text-xs text-gray-500 mt-1">
                Conectarse por Zoom por sí solo no constituye participación válida - un propietario
                remoto debe otorgar un poder a un representante presente.
              </p>
            </section>
          )}

          <p className="text-xs text-gray-400">
            El aviso legal completo y el orden del día detallado de ambas asambleas siguen a
            continuación.
          </p>
        </div>

        <div className="space-y-4">
          <section>
            <p className="font-semibold">When and where</p>
            <p>
              {new Date(data.agm.dateISO).toLocaleDateString("en-US", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
                timeZone: "UTC",
              })}
              {data.agm.callTimes && ` · ${data.agm.callTimes}`}
              {data.agm.location && ` · ${data.agm.location}`}
            </p>
          </section>

          <section>
            <p className="font-semibold">What&apos;s being decided</p>
            <ul className="list-disc pl-5 space-y-1">
              {motions.map((m) => (
                <li key={m.id}>{m.titleEn}</li>
              ))}
            </ul>
          </section>

          <section>
            <p className="font-semibold">What you need to do</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Attend in person, or</li>
              <li>
                Appoint a proxy (another owner, a family member, or a third party)
                {proxyDeadlineEn ? ` by ${proxyDeadlineEn}` : " before the meeting"}
              </li>
              {rsvpDeadlineEn && <li>RSVP by {rsvpDeadlineEn}</li>}
              {(data.agm.proxyContactName || data.agm.proxyContactEmail) && (
                <li>
                  Send your signed proxy to {data.agm.proxyContactName}
                  {data.agm.proxyContactEmail && ` (${data.agm.proxyContactEmail})`}
                </li>
              )}
            </ul>
          </section>

          {data.agm.zoomInfo && (
            <section>
              <p className="font-semibold">Zoom</p>
              <p className="whitespace-pre-line">{data.agm.zoomInfo}</p>
              <p className="text-xs text-gray-500 mt-1">
                Joining by Zoom alone is not valid participation - a remote owner must still appoint
                an in-person representative.
              </p>
            </section>
          )}

          <p className="text-xs text-gray-400">
            The full legal notice and detailed agenda for both meetings follow.
          </p>
        </div>
      </div>
    </div>
  )
}
