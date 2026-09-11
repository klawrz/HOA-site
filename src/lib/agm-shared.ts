import type {
  Agm,
  AgmTrack,
  AgmAgendaItem,
  AgmParticipation,
  AgmTrackKind,
  AgmParticipationStatus,
  AgmProxyHolderType,
  AgmDocumentPreference,
} from "@/generated/prisma"

// Client-safe AGM constants, seed types and tally types - no imports from
// "@/lib/db", so this module can be pulled into client components. The
// data-loading and tally *logic* lives in "@/lib/agm" (server only).

export const AGM_TRACK_LABEL: Record<AgmTrackKind, { es: string; en: string }> = {
  REGIME: {
    es: "Asamblea General Anual Ordinaria - Régimen de Propiedad en Condominio",
    en: "General Annual Ordinary Meeting - Condominium Property Regime",
  },
  CIVIL_ASSOCIATION: {
    es: "Asamblea General de Asociados - Asociación de Condóminos Sampaguita Villas A.C.",
    en: "Annual General Associates Meeting - Asociación de Condóminos Sampaguita Villas A.C.",
  },
}

export const AGM_DOCUMENT_PREFERENCES: AgmDocumentPreference[] = ["SUMMARY", "FULL"]
export const AGM_DOCUMENT_PREFERENCE_LABEL: Record<AgmDocumentPreference, string> = {
  SUMMARY: "Quick summary",
  FULL: "Full package",
}

// Fraction of the total number of owners (villas) that may be represented
// by proxy, per the 2013 Regime change of 22 Nov 1999, Motion #7.
export const PROXY_CAP_FRACTION = 0.35

// How far ahead an upcoming AGM lights up the dashboard banner. Dara: the
// three months before an AGM are where most of the effort and usage go, so
// every role gets a highlighted shortcut to it during that window.
export const AGM_BANNER_WINDOW_DAYS = 92

export type AgendaSeed = {
  numeral: string
  kind: "ITEM" | "MOTION"
  titleEs: string
  titleEn: string
  isExtraordinary?: boolean
}

export type AgmTrackWithItems = AgmTrack & { items: AgmAgendaItem[] }
export type FullAgm = Agm & {
  tracks: AgmTrackWithItems[]
  participation: AgmParticipation[]
}

export type AgmUnitInput = {
  id: string
  label: string
}

// One villa = one vote (2013 Regime, confirmed by Dara 2026-09-10 - no
// pro-indiviso weighting for assembly voting). `allocationPercent` is still
// used for the dues table, just not for quorum.
export type AgmUnitRow = {
  unitId: string
  participationId: string | null
  label: string
  status: AgmParticipationStatus
  eligible: boolean
  eligibilitySource: "reviewed" | "dues-suggested"
  proxyHolderName: string | null
  proxyHolderType: AgmProxyHolderType | null
  proxyComplete: boolean // both proxy letters + ID uploaded
  proxyVerified: boolean
}

export type AgmTally = {
  totalUnits: number
  responded: number
  outstanding: number
  inPerson: number
  byProxy: number
  notAttending: number
  eligibleAttendingCount: number // eligible villas present in person or by proxy
  rawAttendingCount: number
  proxyCount: number
  proxyCap: number
  proxyOverCap: boolean
  proxiesAwaitingVerification: number
  ineligibleUnits: number
  // quorumCount = villas needed on first call (ceil of quorumPct% of total)
  perTrack: {
    kind: AgmTrackKind
    quorumPct: number
    quorumCount: number
    firstCallMet: boolean
  }[]
  rows: AgmUnitRow[]
}

// Default agenda for the Condominium Regime track - based on the 2025
// "Primera, Segunda y Tercera Convocatoria" plus the standing items Dara
// listed 2026-09-10. `fy` is the meeting's fiscal year: financials are
// approved for `fy`; budget / reserve / assessments / contracts are for
// `fy + 1`. The Board / PM can edit, add, remove and reorder every line
// from the agenda editor.
export function regimeAgendaSeed(fy: number): AgendaSeed[] {
  const ny = fy + 1
  return [
    {
      numeral: "I",
      kind: "ITEM",
      titleEs:
        "Propuesta, discusión y designación del Presidente, Secretario y escrutadores de la Asamblea de Condóminos; y establecimiento del quórum.",
      titleEn:
        "Proposal, discussion and appointment of a President, Secretary and Scrutinizers for the Condominium Owners Meeting; and establishment of quorum.",
    },
    {
      numeral: "II",
      kind: "ITEM",
      titleEs: `Informe de la Administración del Condominio y aprobación de los estados financieros del año ${fy}.`,
      titleEn: `Administration report of the Condominium and approval of the financial statements for the year ${fy}.`,
    },
    {
      numeral: "III",
      kind: "ITEM",
      titleEs: "Presentación del Reporte de la mesa directiva.",
      titleEn: "Board of Directors annual report.",
    },
    {
      numeral: "IV",
      kind: "ITEM",
      titleEs: `Propuesta y aprobación del presupuesto operativo, fondo de reserva y cuotas para el año ${ny}:`,
      titleEn: `Proposal and approval of the operating budget, reserve fund and assessments for the year ${ny}:`,
    },
    {
      numeral: "IV.a",
      kind: "MOTION",
      titleEs: `Aprobación del presupuesto operativo ${ny}.`,
      titleEn: `Approval of the ${ny} operating budget.`,
    },
    {
      numeral: "IV.b",
      kind: "MOTION",
      titleEs: `Aprobación de la aportación al fondo de reserva ${ny}.`,
      titleEn: `Approval of the ${ny} reserve fund contribution.`,
    },
    {
      numeral: "IV.c",
      kind: "MOTION",
      titleEs: `Aprobación de las cuotas condominales ${ny}.`,
      titleEn: `Approval of the ${ny} condominium assessments (dues).`,
    },
    {
      numeral: "V",
      kind: "MOTION",
      titleEs: `Ratificación del contrato del administrador de la propiedad (Property Manager) para el año ${ny}.`,
      titleEn: `Ratification of the property manager's contract for the year ${ny}.`,
    },
    {
      numeral: "VI",
      kind: "MOTION",
      titleEs: "Asunto de asamblea extraordinaria: propuesta y aprobación del reglamento condominal.",
      titleEn: "Extraordinary assembly topic: proposal and approval of the Condominium Rules and Regulations.",
      isExtraordinary: true,
    },
    {
      numeral: "VII",
      kind: "MOTION",
      titleEs: "Elección o ratificación de miembros del comité de vigilancia y su presidente.",
      titleEn: "Election or ratification of the surveillance committee and its President.",
    },
    {
      numeral: "VIII",
      kind: "MOTION",
      titleEs:
        "Ratificación de Asociación de Condóminos Sampaguita Villas A.C. como administrador del condominio.",
      titleEn:
        "Ratification of Asociación de Condóminos Sampaguita Villas A.C. as administrator of the condominium.",
    },
    {
      numeral: "IX",
      kind: "ITEM",
      titleEs: "Definir fecha de la siguiente asamblea.",
      titleEn: "Define the date of the next assembly.",
    },
    {
      numeral: "X",
      kind: "ITEM",
      titleEs: "Nombramiento de Delegados.",
      titleEn: "Appointment of Delegates.",
    },
    { numeral: "XI", kind: "ITEM", titleEs: "Asuntos Generales.", titleEn: "General Matters." },
    { numeral: "XII", kind: "ITEM", titleEs: "Clausura.", titleEn: "Adjourn." },
  ]
}

// Default agenda for the Civil Association track - based on the 2025
// "Primera y Segunda Convocatoria para Asamblea General de Asociados" plus
// the standing appointments Dara listed 2026-09-10 (directors, legal
// counsel, accountant for `fy + 1`).
export function civilAssociationAgendaSeed(fy: number): AgendaSeed[] {
  const ny = fy + 1
  return [
    {
      numeral: "I",
      kind: "ITEM",
      titleEs:
        "Propuesta, discusión y designación del Presidente, Secretario y escrutadores de la Asamblea; y establecimiento del quórum.",
      titleEn:
        "Proposal, discussion and appointment of a President, Secretary and Scrutinizers for the Meeting; and establishment of quorum.",
    },
    {
      numeral: "II",
      kind: "MOTION",
      titleEs: "Aceptación de nuevos miembros a la asociación.",
      titleEn: "Acceptance of new members to the association.",
    },
    {
      numeral: "III",
      kind: "MOTION",
      titleEs: `Elección y nombramiento de los miembros de la Junta Directiva de la Asociación para el periodo ${ny}.`,
      titleEn: `Election and appointment of the Directors of the Association for the period ${ny}.`,
    },
    {
      numeral: "IV",
      kind: "MOTION",
      titleEs: `Nombramiento del asesor legal (legal counsel) para el año ${ny}.`,
      titleEn: `Appointment of the legal counsel for the year ${ny}.`,
    },
    {
      numeral: "V",
      kind: "MOTION",
      titleEs: `Nombramiento del Contador para el año ${ny}.`,
      titleEn: `Appointment of the Accountant for the year ${ny}.`,
    },
    {
      numeral: "VI",
      kind: "ITEM",
      titleEs: "Definir fecha para la siguiente Asamblea anual.",
      titleEn: "Define the date for the next Annual Meeting.",
    },
    {
      numeral: "VII",
      kind: "ITEM",
      titleEs: "Nombramiento de Delegados.",
      titleEn: "Appointment of Delegates.",
    },
    { numeral: "VIII", kind: "ITEM", titleEs: "Clausura.", titleEn: "Adjourn." },
  ]
}

export function agendaSeedFor(kind: AgmTrackKind, fy: number): AgendaSeed[] {
  return kind === "REGIME" ? regimeAgendaSeed(fy) : civilAssociationAgendaSeed(fy)
}

// --- Proxy letter text --------------------------------------------------
//
// Bilingual "carta poder" wording, transcribed from the 2025 Sampaguita
// proxy templates (Régimen Condominal + Asociación Civil). The owner opens
// a pre-filled copy, prints it, signs BOTH language sides plus the witness
// blocks, scans it, and uploads it. `___` marks a hand-filled blank.

export type ProxyLetterFields = {
  granterNames: string // owner name(s) on the villa
  unitLabel: string // e.g. "Villa 7"
  meetingDateEs: string // e.g. "6 de noviembre de 2026"
  meetingDateEn: string // e.g. "November 6, 2026"
}

// --- Convocatoria (call notice) narrative ------------------------------
//
// The paragraph that precedes the ORDEN DEL DÍA / AGENDA, transcribed from
// the 2025 Sampaguita convocatorias. The agenda itself is rendered from
// the AGM's live AgmAgendaItem rows (the Board may have edited them), and a
// track's saved `callBodyEs/En` overrides this default when present.

export type ConvocatoriaFields = {
  meetingDateEs: string
  meetingDateEn: string
  callTimes: string | null
  location: string | null
  quorumPct: number
}

// Long-form meeting date in both languages, from an ISO string or Date.
// Used by every generated document so server and client agree.
export function agmMeetingDateStrings(date: string | Date) {
  const d = typeof date === "string" ? new Date(date) : date
  const opts: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }
  return {
    es: d.toLocaleDateString("es-MX", opts),
    en: d.toLocaleDateString("en-US", opts),
  }
}

export function convocatoriaText(kind: AgmTrackKind, f: ConvocatoriaFields) {
  const whenEs = `el ${f.meetingDateEs}${f.callTimes ? ` (${f.callTimes})` : ""}`
  const whenEn = `on ${f.meetingDateEn}${f.callTimes ? ` (${f.callTimes})` : ""}`
  const placeEs = f.location ? ` en ${f.location}` : ""
  const placeEn = f.location ? ` at ${f.location}` : ""
  const q = f.quorumPct

  if (kind === "REGIME") {
    return {
      headingEs:
        "Primera, Segunda y Tercera Convocatoria para Asamblea General Anual Ordinaria del Régimen de Propiedad en Condominio “Sampaguita”",
      headingEn:
        "First, Second and Third Call Notice for a General Annual Ordinary Meeting of the Condominium Property Regime “Sampaguita”",
      introEs:
        `El suscrito, como representante legal de la Asociación de Condóminos Sampaguita Villas A.C. — que a su vez es el administrador del ` +
        `Régimen de Propiedad en Condominio “Sampaguita” —, con fundamento en el reglamento del Condominio, por medio de la presente ` +
        `CONVOCA a los condóminos a una Asamblea General Anual Ordinaria de Condóminos a celebrarse ${whenEs}${placeEs}, con el siguiente ORDEN DEL DÍA:`,
      introEn:
        `The undersigned, as legal representative of Asociación de Condóminos Sampaguita Villas A.C. — which is the administrator of the ` +
        `Condominium Property Regime “Sampaguita” —, in accordance with the rules and regulations of the Condominium, hereby CALLS the ` +
        `homeowners to a General Annual Ordinary Homeowners Meeting to be held ${whenEn}${placeEn}, with the following AGENDA:`,
      quorumEs:
        `La Asamblea se declarará debidamente instalada (i) en primera convocatoria con la asistencia de condóminos que representen el ${q}% del total, ` +
        `y (ii) en segunda convocatoria con los condóminos que estén presentes. Los acuerdos adoptados serán obligatorios para los presentes, ausentes y disidentes.`,
      quorumEn:
        `The Assembly will be duly installed (i) on first call with the attendance of homeowners representing ${q}% of the total, ` +
        `and (ii) on second call with whichever homeowners are present. The agreements adopted will be binding on those present, absent and dissenting.`,
    }
  }
  return {
    headingEs:
      "Primera y Segunda Convocatoria para Asamblea General de Asociados de la Asociación de Condóminos Sampaguita Villas A.C.",
    headingEn:
      "First and Second Call Notice for an Annual General Associates Meeting of Asociación de Condóminos Sampaguita Villas A.C.",
    introEs:
      `El suscrito, en su carácter de representante legal de la Asociación de Condóminos Sampaguita Villas A.C. (“Asociación”), con fundamento en ` +
      `los estatutos de la Asociación, por medio de la presente CONVOCA a los asociados a una Asamblea General de Asociados a celebrarse ${whenEs}${placeEs}, ` +
      `con el siguiente ORDEN DEL DÍA:`,
    introEn:
      `The undersigned, as legal representative of Asociación de Condóminos Sampaguita Villas A.C. (“Association”), in accordance with the bylaws of ` +
      `the Association, hereby CALLS the associates to an Annual General Associates Meeting to be held ${whenEn}${placeEn}, with the following AGENDA:`,
    quorumEs:
      `La Asamblea se declarará debidamente instalada (i) en primera convocatoria con la asistencia del ${q}% del total de los asociados, ` +
      `y (ii) en segunda convocatoria con los asociados que estén presentes. Los acuerdos adoptados serán obligatorios para los presentes, ausentes y disidentes.`,
    quorumEn:
      `The Assembly will be duly installed (i) on first call with the attendance of ${q}% of the total associates, ` +
      `and (ii) on second call with whichever associates are present. The agreements adopted will be binding on those present, absent and dissenting.`,
  }
}

// The full editable convocatoria narrative (heading + intro + quorum
// clause) as one ES string and one EN string. Stored on the track's
// callBodyEs/En so the Board / PM can edit the whole document; the agenda
// table and signature block are appended by the renderer.
export function convocatoriaFullText(kind: AgmTrackKind, f: ConvocatoriaFields) {
  const t = convocatoriaText(kind, f)
  return {
    es: `${t.headingEs}\n\n${t.introEs}\n\n${t.quorumEs}`,
    en: `${t.headingEn}\n\n${t.introEn}\n\n${t.quorumEn}`,
  }
}

// --- Informative-package cover email ----------------------------------

export type CoverEmailFields = {
  year: number
  meetingDateEs: string
  meetingDateEn: string
  callTimes: string | null
  location: string | null
  proxyContactName: string
  proxyContactEmail: string
}

export function coverEmailText(f: CoverEmailFields) {
  const fyNext = f.year + 1
  const loc = f.location || "___"
  const when = f.callTimes ? `, ${f.callTimes}` : ""
  return {
    subject: `Paquete Informativo – Reunión General Anual ${f.year} / Informative Package – ${f.year} Annual General Meeting`,
    bodyEs:
      `Estimados Propietarios de Sampaguita,\n\n` +
      `En nombre del Consejo Directivo, nos complace adjuntarles el Paquete Informativo correspondiente a la Reunión General Anual ${f.year}, ` +
      `que se celebrará el ${f.meetingDateEs}${when} en ${loc}.\n\n` +
      `Les recordamos la importancia de su asistencia o participación a través de su representante. En caso de no poder asistir de manera presencial, ` +
      `usted tiene la opción de conectarse vía Zoom; la invitación a la reunión virtual la encontrará al final de este correo. Sin embargo, para que su ` +
      `participación sea válida, deberá designar a un representante que asista en persona y presente las cartas poder debidamente firmadas y completadas ` +
      `en ambos lados, español e inglés.\n\n` +
      `Se adjunta el documento con la siguiente información:\n\n` +
      `•\tConvocatoria para la Asamblea General Anual Ordinaria\n` +
      `•\tConvocatoria para la Asamblea de la Asociación Civil\n` +
      `•\tReporte financiero ${f.year}\n` +
      `•\tPropuesta de presupuesto ${fyNext}\n` +
      `•\tCuotas ${fyNext}\n\n` +
      `Puede enviar sus cartas poder escaneadas a:\n\n${f.proxyContactName}\n${f.proxyContactEmail}\n\n` +
      `Recuerde que, si no está al corriente con sus cuotas y tarifas, no podrá votar durante la asamblea. Le recomendamos revisar su cuenta de HOA y ` +
      `asegurarse de estar al día o realizar los pagos correspondientes.\n\n¡Saludos cordiales!`,
    bodyEn:
      `Dear homeowners of Sampaguita,\n\n` +
      `On behalf of the Board of Directors, we are pleased to attach the Informative Package of the ${f.year} Annual General Meeting, ` +
      `which will take place on ${f.meetingDateEn}${when} at ${loc}.\n\n` +
      `We remind you of the importance of your attendance or participation through your representative. If you are unable to attend in person, ` +
      `you have the option to connect via Zoom; the invitation to the virtual meeting can be found at the end of this email. However, in order for your ` +
      `participation to be valid, you must designate a representative to attend in person and present the duly signed proxy letters, both sides, English ` +
      `and Spanish.\n\n` +
      `Please find attached the file with the following information:\n\n` +
      `•\tCall notice for the Annual Ordinary Meeting\n` +
      `•\tCall notice for the Civil Association General Meeting\n` +
      `•\tFinancial report ${f.year}\n` +
      `•\tProposed Budget ${fyNext}\n` +
      `•\tDues ${fyNext}\n\n` +
      `You may send your scanned proxies to:\n\n${f.proxyContactName}\n${f.proxyContactEmail}\n\n` +
      `Please remember that if you are not up to date with your dues and fees, you will not be eligible to vote during the assembly. We recommend ` +
      `reviewing your HOA account and making sure it is current or settling any outstanding payments.\n\nBest regards,`,
  }
}

export function proxyLetterText(kind: AgmTrackKind, f: ProxyLetterFields) {
  const g = f.granterNames || "___"
  const u = f.unitLabel || "___"
  if (kind === "REGIME") {
    return {
      titleEs: "Carta Poder — Régimen de Propiedad en Condominio “Sampaguita”",
      titleEn: "Proxy Letter — Condominium Property Regime “Sampaguita”",
      bodyEs:
        `Fecha ______________________.\n\n` +
        `YO/NOSOTROS ${g}, fideicomisario(s) / propietario(s) de la unidad privativa identificada como ${u}, ` +
        `misma que forma parte del Régimen de Propiedad en Condominio “Sampaguita” (“Condominio”) ubicado en San José del Cabo, Baja California Sur, México, ` +
        `en este acto otorgo/otorgamos poder amplio y suficiente a:\n\n______________________________________\n\n` +
        `para que en mi/nuestro nombre y representación comparezca, participe y ejerza mis/nuestros derechos de voto en la próxima ` +
        `Asamblea General de Condóminos Sampaguita a celebrarse el ${f.meetingDateEs} (“Asamblea”), o cualquier aplazamiento de la misma; ` +
        `confirmo y ratifico la actuación legal de dicho apoderado y la revocación de cualquier poder o carta poder otorgada a esta fecha sobre la(s) unidad(es) mencionada(s).\n\n` +
        `Este poder será válido para votar en la Asamblea en primera, segunda, tercera y subsecuentes convocatorias. ` +
        `Podrá ser enviado por correo electrónico, acompañado de copia del pasaporte del otorgante para validar la firma, ` +
        `siempre y cuando el original sea entregado posteriormente en un plazo no mayor de 90 días a partir de la fecha de la celebración de la asamblea.`,
      bodyEn:
        `Date ______________________.\n\n` +
        `I/WE ${g}, trust beneficiary / owner of the private unit identified as ${u}, ` +
        `which is part of the Condominium Property Regime “Sampaguita” (“Condominium”) located at San José del Cabo, Baja California Sur, México, ` +
        `hereby grant ample and sufficient authority to:\n\n______________________________________\n\n` +
        `to act on my/our behalf to attend, participate, and exercise my/our voting rights in the upcoming ` +
        `General Assembly of the Condominium Condominios Sampaguita to be held on ${f.meetingDateEn} (“Meeting”), or any adjournment thereof; ` +
        `and I confirm and ratify the legal acting of said attorney-in-fact, and revoke any powers or proxies granted to this date over said unit(s).\n\n` +
        `This Power of Attorney is valid for voting at the Meeting in first, second, third and subsequent calls. ` +
        `It may be sent via email, accompanied by a copy of the passport of the grantor to validate the signature, ` +
        `as long as the signed original is delivered within a period no longer than 90 days from the date of the meeting.`,
    }
  }
  return {
    titleEs: "Carta Poder y Acuerdo de Adhesión — Asociación de Condóminos Sampaguita Villas A.C.",
    titleEn: "Proxy Form & Joining Agreement — Asociación de Condóminos Sampaguita Villas A.C.",
    bodyEs:
      `Fecha ______________________.\n\n` +
      `YO/NOSOTROS ${g}, fideicomisario(s) / propietario(s) de la unidad privativa identificada como ${u}, ` +
      `misma que forma parte de la Asociación de Sampaguita Villas A.C. (“Asociación Civil”), ubicada en la Zona Hotelera de San José del Cabo, Baja California Sur, México, ` +
      `por medio del presente acordamos unirnos a la Asociación de Condóminos Sampaguita Villas A.C. y otorgar poder amplio y suficiente a:\n\n______________________________________\n\n` +
      `para que en mi/nuestro nombre y representación comparezca, participe y ejerza mis/nuestros derechos de voto en la próxima ` +
      `Asamblea General de la Asociación de Sampaguita Villas A.C. a celebrarse el ${f.meetingDateEs} (“Asamblea”), o cualquier aplazamiento de la misma; ` +
      `confirmo y ratifico la actuación legal de dicho apoderado y la revocación de cualquier poder o carta poder otorgada a esta fecha sobre la(s) unidad(es) mencionada(s).\n\n` +
      `Este poder será válido para votar en la Asamblea en primera, segunda, tercera y subsecuentes convocatorias. ` +
      `Podrá ser enviado por correo electrónico, acompañado de copia del pasaporte del otorgante para validar la firma, ` +
      `siempre y cuando el original sea entregado posteriormente en un plazo no mayor de 90 días a partir de la fecha de la celebración de la asamblea.`,
    bodyEn:
      `Date ______________________.\n\n` +
      `I/WE ${g}, trust beneficiary / owner of the private unit identified as ${u}, ` +
      `which is part of Asociación de Sampaguita Villas A.C. (“Civil Association”) located in the Hotel Zone of San José del Cabo, Baja California Sur, México, ` +
      `hereby agree to join Asociación de Condóminos Sampaguita Villas A.C. and grant ample and sufficient authority to:\n\n______________________________________\n\n` +
      `to act on my/our behalf to attend, participate, and exercise my/our voting rights in the upcoming ` +
      `General Assembly of Asociación de Sampaguita A.C. to be held on ${f.meetingDateEn} (“Meeting”), or any adjournment thereof; ` +
      `and I confirm and ratify the legal acting of said attorney-in-fact, and revoke any powers or proxies granted to this date over said unit(s).\n\n` +
      `This Power of Attorney is valid for voting at the Meeting in first, second, third and subsequent calls. ` +
      `It may be sent via email, accompanied by a copy of the passport of the grantor to validate the signature, ` +
      `as long as the signed original is delivered within a period no longer than 90 days from the date of the meeting.`,
  }
}
