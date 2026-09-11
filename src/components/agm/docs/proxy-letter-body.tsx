// One pre-filled bilingual proxy letter (Regime or Civil Association) as a
// printable block. Shared by the standalone owner proxy route and the
// owner's combined package.

export type ProxyLetter = {
  titleEs: string
  titleEn: string
  bodyEs: string
  bodyEn: string
}

export function ProxyLetterBody({
  letter,
  granterNames,
}: {
  letter: ProxyLetter
  granterNames: string
}) {
  return (
    <div className="text-[13px] leading-relaxed">
      <div className="text-center mb-4">
        <p className="font-semibold">{letter.titleEs}</p>
        <p className="text-gray-600">{letter.titleEn}</p>
      </div>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="whitespace-pre-line md:border-r md:pr-6 print:border-r">{letter.bodyEs}</div>
        <div className="whitespace-pre-line">{letter.bodyEn}</div>
      </div>
      <div className="mt-10 space-y-6 text-[12px]">
        <div className="border-t border-gray-400 pt-1">FIRMA / SIGNATURE</div>
        <div className="border-t border-gray-400 pt-1">
          NOMBRE(S) COMPLETO(S) / COMPLETE NAME(S) — {granterNames || "___"}
        </div>
        <div className="grid grid-cols-2 gap-6">
          <div className="border-t border-gray-400 pt-1">FIRMA TESTIGO / WITNESS SIGNATURE</div>
          <div className="border-t border-gray-400 pt-1">FIRMA TESTIGO / WITNESS SIGNATURE</div>
          <div className="border-t border-gray-400 pt-1">NOMBRE TESTIGO / WITNESS NAME</div>
          <div className="border-t border-gray-400 pt-1">NOMBRE TESTIGO / WITNESS NAME</div>
        </div>
      </div>
    </div>
  )
}
