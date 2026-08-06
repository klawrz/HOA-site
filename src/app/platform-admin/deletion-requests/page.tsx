import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download, Clock, CheckCircle2, XCircle, Trash2 } from "lucide-react"
import { db } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"

const statusBadge: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  APPROVED: "bg-blue-100 text-blue-700",
  DENIED: "bg-red-100 text-red-700",
  COMPLETED: "bg-gray-100 text-gray-700",
}

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  APPROVED: <Clock className="h-3.5 w-3.5" />,
  DENIED: <XCircle className="h-3.5 w-3.5" />,
  COMPLETED: <Trash2 className="h-3.5 w-3.5" />,
}

export default async function DeletionRequestsPage() {
  const session = await requirePlatformAdmin()
  if (!session) notFound()

  const requests = await db.orgDeletionRequest.findMany({ orderBy: { requestedAt: "desc" } })

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/platform-admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Deletion Requests</h1>
        <p className="text-gray-500 mt-1">
          Every org deletion ever requested, and its approval trail - the business-continuity record.
        </p>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {requests.length === 0 && <p className="p-6 text-sm text-gray-500">No deletion requests yet.</p>}
        {requests.map((r) => (
          <div key={r.id} className="p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">{r.orgName}</p>
                <p className="text-xs text-gray-500">
                  {r.orgSlug} · requested by {r.requestedByEmail} on {r.requestedAt.toLocaleDateString()}
                </p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${statusBadge[r.status]}`}>
                {statusIcon[r.status]} {r.status}
              </span>
            </div>

            {r.status !== "COMPLETED" && (
              <div className="text-xs text-gray-500 space-y-0.5 pl-1">
                <p className="flex items-center gap-1.5">
                  {r.accountOwnerApprovedAt ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-gray-300" />
                  )}
                  Account Owner: {r.accountOwnerApprovedAt ? `approved by ${r.accountOwnerApprovedByName ?? r.accountOwnerApprovedByEmail}` : "waiting"}
                </p>
                <p className="flex items-center gap-1.5">
                  {r.boardMemberApprovedAt ? (
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                  ) : (
                    <Clock className="h-3 w-3 text-gray-300" />
                  )}
                  Board Member: {r.boardMemberApprovedAt ? `approved by ${r.boardMemberApprovedByName ?? r.boardMemberApprovedByEmail}` : "waiting"}
                </p>
              </div>
            )}

            {r.status === "DENIED" && (
              <p className="text-xs text-red-600 pl-1">
                Denied by {r.deniedByName ?? r.deniedByEmail}{r.denialReason ? `: "${r.denialReason}"` : "."}
              </p>
            )}

            {r.status === "COMPLETED" && (
              <div className="text-xs text-gray-500 pl-1 space-y-0.5">
                <p>Deleted {r.completedAt?.toLocaleDateString()}.</p>
                {r.backupFileUrl && (
                  <a href={r.backupFileUrl} className="text-blue-600 hover:underline flex items-center gap-1.5">
                    <Download className="h-3 w-3" /> Download the full backup
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
