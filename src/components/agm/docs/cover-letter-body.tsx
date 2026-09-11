// The bilingual cover letter as a plain letter (no copy buttons) - used in
// the combined AGM packet. The standalone /cover-email route keeps its
// interactive copy-to-clipboard view.

export function CoverLetterBody({
  subject,
  bodyEs,
  bodyEn,
  zoomInfo,
}: {
  subject: string
  bodyEs: string
  bodyEn: string
  zoomInfo: string | null
}) {
  return (
    <div className="text-[13px] leading-relaxed">
      <p className="font-semibold">{subject}</p>
      <p className="whitespace-pre-line mt-4">{bodyEs}</p>
      <hr className="my-6 border-gray-300" />
      <p className="whitespace-pre-line">{bodyEn}</p>
      {zoomInfo && (
        <>
          <hr className="my-6 border-gray-300" />
          <p className="whitespace-pre-line text-gray-700">{zoomInfo}</p>
        </>
      )}
    </div>
  )
}
