"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { AlertTriangle, Check, CircleSlash } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import type { AgmTally } from "@/lib/agm-shared"
import { setAgmEligibility, setProxyVerified } from "@/app/actions/agm"
import { PARTICIPATION_LABEL, PROXY_TYPE_LABEL } from "./types"
import { RecordResponseDialog } from "./record-response-dialog"

function Stat({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string
  value: string
  hint?: string
  tone?: "default" | "good" | "warn"
}) {
  const toneCls =
    tone === "good" ? "text-green-700" : tone === "warn" ? "text-amber-700" : "text-gray-900"
  return (
    <div className="bg-white border rounded-xl px-4 py-3">
      <p className="text-[11px] uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-lg font-semibold ${toneCls}`}>{value}</p>
      {hint && <p className="text-[11px] text-gray-400 mt-0.5">{hint}</p>}
    </div>
  )
}

export function ParticipationConsole({
  agmId,
  tally,
  ownerByUnit,
  canManage,
}: {
  agmId: string
  tally: AgmTally
  ownerByUnit: Record<string, string>
  canManage: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [showRoster, setShowRoster] = useState(false)

  function eligibility(unitId: string, choice: "yes" | "no" | "reset") {
    startTransition(async () => {
      const fd = new FormData()
      fd.set("agmId", agmId)
      fd.set("unitId", unitId)
      fd.set("eligible", choice)
      const r = await setAgmEligibility(fd)
      if (r.success) router.refresh()
      else toast.error(r.error || "Could not update")
    })
  }

  function verify(participationId: string, verified: boolean) {
    startTransition(async () => {
      const r = await setProxyVerified(participationId, verified)
      if (r.success) {
        toast.success(verified ? "Proxy verified" : "Verification cleared")
        router.refresh()
      } else {
        toast.error(r.error || "Could not update")
      }
    })
  }

  const quorumCount = tally.perTrack[0]?.quorumCount ?? Math.ceil(tally.totalUnits / 2)
  const quorumMet = tally.eligibleAttendingCount >= quorumCount

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat
          label="Responded"
          value={`${tally.responded}/${tally.totalUnits}`}
          hint={`${tally.outstanding} outstanding`}
        />
        <Stat
          label="Quorum (eligible present)"
          value={`${tally.eligibleAttendingCount}/${tally.totalUnits}`}
          hint={`first call needs ${quorumCount} villas`}
          tone={quorumMet ? "good" : "warn"}
        />
        <Stat
          label="In person / proxy"
          value={`${tally.inPerson} / ${tally.byProxy}`}
          hint={`${tally.notAttending} not attending`}
        />
        <Stat
          label="Proxies vs cap"
          value={`${tally.proxyCount}/${tally.proxyCap}`}
          hint="≤35% of villas"
          tone={tally.proxyOverCap ? "warn" : "default"}
        />
      </div>

      {(tally.proxyOverCap || tally.proxiesAwaitingVerification > 0 || tally.ineligibleUnits > 0) && (
        <div className="flex flex-wrap gap-2 text-xs">
          {tally.proxyOverCap && (
            <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 rounded-full px-2.5 py-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Proxy cap exceeded ({tally.proxyCount} &gt;{" "}
              {tally.proxyCap})
            </span>
          )}
          {tally.proxiesAwaitingVerification > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-800 rounded-full px-2.5 py-1">
              {tally.proxiesAwaitingVerification} proxy{tally.proxiesAwaitingVerification > 1 ? "ies" : ""} awaiting
              verification
            </span>
          )}
          {tally.ineligibleUnits > 0 && (
            <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 rounded-full px-2.5 py-1">
              <CircleSlash className="h-3.5 w-3.5" /> {tally.ineligibleUnits} not eligible to vote (dues)
            </span>
          )}
        </div>
      )}

      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => setShowRoster((s) => !s)}
          className="text-sm text-blue-600 hover:underline"
        >
          {showRoster ? "Hide" : "Show"} the villa roster
        </button>
        {canManage && <RecordResponseDialog agmId={agmId} rows={tally.rows} ownerByUnit={ownerByUnit} />}
      </div>

      {showRoster && (
        <div className="border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-gray-400 border-b">
                <th className="px-3 py-2 font-medium">Villa</th>
                <th className="px-3 py-2 font-medium">Response</th>
                <th className="px-3 py-2 font-medium">Proxy</th>
                <th className="px-3 py-2 font-medium">Eligible</th>
              </tr>
            </thead>
            <tbody>
              {tally.rows.map((r) => (
                <tr key={r.unitId} className="border-b last:border-0">
                  <td className="px-3 py-2">
                    <div className="font-medium">{r.label}</div>
                    <div className="text-xs text-gray-400">{ownerByUnit[r.unitId] ?? "—"}</div>
                  </td>
                  <td className="px-3 py-2">
                    <Badge
                      variant={
                        r.status === "NO_RESPONSE"
                          ? "outline"
                          : r.status === "NOT_ATTENDING"
                            ? "secondary"
                            : "default"
                      }
                    >
                      {PARTICIPATION_LABEL[r.status]}
                    </Badge>
                  </td>
                  <td className="px-3 py-2">
                    {r.status === "BY_PROXY" ? (
                      <div className="text-xs">
                        <div>
                          {r.proxyHolderName ?? "—"}
                          {r.proxyHolderType && (
                            <span className="text-gray-400"> · {PROXY_TYPE_LABEL[r.proxyHolderType]}</span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={r.proxyComplete ? "text-green-600" : "text-amber-600"}>
                            {r.proxyComplete ? "docs complete" : "docs incomplete"}
                          </span>
                          {canManage && r.participationId && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => verify(r.participationId!, !r.proxyVerified)}
                              className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                                r.proxyVerified
                                  ? "bg-green-100 text-green-700"
                                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                              }`}
                            >
                              <Check className="h-3 w-3" />
                              {r.proxyVerified ? "verified" : "verify"}
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-1.5">
                      <span
                        className={
                          r.eligible ? "text-green-700 text-xs" : "text-gray-500 text-xs"
                        }
                      >
                        {r.eligible ? "Yes" : "No"}
                        <span className="text-gray-300">
                          {" "}
                          {r.eligibilitySource === "dues-suggested" ? "(from dues)" : "(reviewed)"}
                        </span>
                      </span>
                      {canManage && (
                        <span className="flex gap-1">
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => eligibility(r.unitId, "yes")}
                            className="text-[11px] rounded bg-gray-100 hover:bg-green-100 px-1.5 py-0.5"
                          >
                            Y
                          </button>
                          <button
                            type="button"
                            disabled={pending}
                            onClick={() => eligibility(r.unitId, "no")}
                            className="text-[11px] rounded bg-gray-100 hover:bg-red-100 px-1.5 py-0.5"
                          >
                            N
                          </button>
                          {r.eligibilitySource === "reviewed" && (
                            <button
                              type="button"
                              disabled={pending}
                              onClick={() => eligibility(r.unitId, "reset")}
                              className="text-[11px] rounded bg-gray-100 hover:bg-gray-200 px-1.5 py-0.5"
                            >
                              ↺
                            </button>
                          )}
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
