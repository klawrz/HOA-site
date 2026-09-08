"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Sparkles, RefreshCw, ArrowRight, AlertTriangle, AlertCircle, CheckCircle2 } from "lucide-react"
import { getPMSituation, type PMSituationResult, type PMSituationSeverity } from "@/app/actions/pm-situation"

const severityStyle: Record<PMSituationSeverity, { bar: string; icon: typeof CheckCircle2; iconColor: string; label: string }> = {
  ok: { bar: "border-l-green-400", icon: CheckCircle2, iconColor: "text-green-500", label: "On track" },
  attention: { bar: "border-l-amber-400", icon: AlertCircle, iconColor: "text-amber-500", label: "Needs attention" },
  urgent: { bar: "border-l-red-400", icon: AlertTriangle, iconColor: "text-red-500", label: "Action needed" },
}

export function PMSituationPanel() {
  const [result, setResult] = useState<PMSituationResult | null>(null)
  const [pending, startTransition] = useTransition()

  function load() {
    startTransition(async () => {
      setResult(await getPMSituation())
    })
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loading = pending || result === null

  return (
    <div className="rounded-xl border border-l-4 bg-gradient-to-br from-violet-50/60 to-white border-violet-200 border-l-violet-300 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          Situation · <span className="font-normal text-violet-400 normal-case tracking-normal">AI prototype</span>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="text-gray-400 hover:text-gray-700 disabled:opacity-40 transition-colors"
          aria-label="Refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {loading && <p className="text-sm text-gray-400 mt-2">Reading the property-management state…</p>}

      {!loading && result && !result.ok && (
        <p className="text-sm text-gray-500 mt-2">{result.error}</p>
      )}

      {!loading && result && result.ok && (
        <SituationBody result={result} />
      )}
    </div>
  )
}

function SituationBody({ result }: { result: Extract<PMSituationResult, { ok: true }> }) {
  const s = severityStyle[result.severity]
  const Icon = s.icon
  return (
    <div className={`mt-2 border-l-2 ${s.bar} pl-3`}>
      <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500">
        <Icon className={`h-3.5 w-3.5 ${s.iconColor}`} /> {s.label}
      </div>
      <p className="text-sm text-gray-800 mt-1 leading-relaxed">{result.summary}</p>

      {result.actions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {result.actions.map((a) => (
            <Link
              key={a.href}
              href={a.href}
              className="inline-flex items-center gap-1 text-xs font-medium text-violet-700 bg-white border border-violet-200 rounded-full px-2.5 py-1 hover:bg-violet-50 transition-colors"
            >
              {a.label} <ArrowRight className="h-3 w-3" />
            </Link>
          ))}
        </div>
      )}

      {!result.configured && (
        <p className="text-[11px] text-gray-400 mt-2">
          AI summary unavailable right now — showing a rules-based read. Check the Anthropic API key if this persists.
        </p>
      )}
    </div>
  )
}
