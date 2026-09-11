"use client"

import { useState } from "react"
import { Copy, Check } from "lucide-react"

function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setDone(true)
          setTimeout(() => setDone(false), 1500)
        } catch {
          /* clipboard blocked - the text is selectable below as a fallback */
        }
      }}
      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs hover:bg-gray-50"
    >
      {done ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
      {done ? "Copied" : label}
    </button>
  )
}

export function EmailPreview({
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
  const divider = "\n\n___________________________________________________________________________\n\n"
  const full =
    `Asunto / Subject: ${subject}\n\n` +
    bodyEs +
    divider +
    bodyEn +
    (zoomInfo ? `\n\n_____________________________________________________________________\n\n${zoomInfo}` : "")

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <CopyButton text={full} label="Copy full email" />
        <CopyButton text={subject} label="Copy subject" />
        <CopyButton text={bodyEs} label="Copy Spanish" />
        <CopyButton text={bodyEn} label="Copy English" />
      </div>
      <div className="bg-white border rounded-xl p-4">
        <p className="text-xs uppercase tracking-wide text-gray-400">Asunto / Subject</p>
        <p className="text-sm font-medium">{subject}</p>
      </div>
      <pre className="bg-white border rounded-xl p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {bodyEs}
      </pre>
      <pre className="bg-white border rounded-xl p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">
        {bodyEn}
      </pre>
      {zoomInfo && (
        <pre className="bg-white border rounded-xl p-4 text-sm whitespace-pre-wrap font-sans leading-relaxed">
          {zoomInfo}
        </pre>
      )}
    </div>
  )
}
