import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { ReferralStatusControl } from "./referral-status-control"

const statusBadge: Record<string, string> = {
  NEW: "bg-gray-100 text-gray-600",
  CONTACTED: "bg-blue-100 text-blue-700",
  CONVERTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-600",
}

export default async function PMReferralsPage() {
  const session = await requirePlatformAdmin()
  if (!session) notFound()

  const referrals = await db.pMReferral.findMany({ orderBy: { createdAt: "desc" } })

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/platform-admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Property Manager Referrals</h1>
        <p className="text-gray-500 mt-1">
          Other HOAs and communities that active Property Managers say they also run - leads worth following up on.
        </p>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {referrals.length === 0 && <p className="p-6 text-sm text-gray-500">No referrals yet.</p>}
        {referrals.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {r.propertyName}
                  {r.estimatedUnits ? ` · ~${r.estimatedUnits} units` : ""}
                </p>
                <p className="text-xs text-gray-500">
                  From {r.referredByName || r.referredByEmail} ({r.orgName}) · {r.createdAt.toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusBadge[r.status]}`}>
                {r.status}
              </span>
            </div>

            {(r.contactName || r.contactEmail || r.contactPhone) && (
              <p className="text-xs text-gray-500">
                Contact: {[r.contactName, r.contactEmail, r.contactPhone].filter(Boolean).join(" · ")}
              </p>
            )}
            {r.notes && <p className="text-xs text-gray-400">{r.notes}</p>}

            <div className="flex items-center justify-between pt-1">
              <ReferralStatusControl referralId={r.id} status={r.status} />
              {r.status !== "CONVERTED" && r.status !== "DECLINED" && (
                <Link
                  href={`/platform-admin/new-org?orgName=${encodeURIComponent(r.propertyName)}&referralId=${r.id}`}
                  className="text-xs text-green-700 hover:underline"
                >
                  Start onboarding →
                </Link>
              )}
              {r.status === "CONVERTED" && r.convertedOrgId && (
                <Link href={`/platform-admin/${r.convertedOrgId}`} className="text-xs text-green-700 hover:underline">
                  View organization →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
