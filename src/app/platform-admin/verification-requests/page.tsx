import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Clock, CheckCircle2, XCircle, Download } from "lucide-react"
import { db } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { VerificationRequestControls } from "./verification-request-controls"

const statusBadge: Record<string, string> = {
  PENDING: "bg-orange-100 text-orange-700",
  APPROVED: "bg-green-100 text-green-700",
  DENIED: "bg-red-100 text-red-700",
}

const statusIcon: Record<string, React.ReactNode> = {
  PENDING: <Clock className="h-3.5 w-3.5" />,
  APPROVED: <CheckCircle2 className="h-3.5 w-3.5" />,
  DENIED: <XCircle className="h-3.5 w-3.5" />,
}

export default async function VerificationRequestsPage() {
  const session = await requirePlatformAdmin()
  if (!session) notFound()

  const requests = await db.orgVerificationRequest.findMany({
    include: { org: { select: { name: true, slug: true } } },
    orderBy: { requestedAt: "desc" },
  })

  const custodianCounts = await db.membership.groupBy({
    by: ["orgId"],
    where: { orgId: { in: requests.map((r) => r.orgId) }, role: "ACCOUNT_OWNER" },
    _count: true,
  })
  const custodianCountByOrg = new Map(custodianCounts.map((c) => [c.orgId, c._count]))

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/platform-admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
      </Link>

      <div>
        <h1 className="text-2xl font-bold">Verification Requests</h1>
        <p className="text-gray-500 mt-1">
          Applications to move a workspace from provisional to verified. Approving requires the org to already have
          at least two custodians.
        </p>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {requests.length === 0 && <p className="p-6 text-sm text-gray-500">No verification requests yet.</p>}
        {requests.map((r) => {
          const custodianCount = custodianCountByOrg.get(r.orgId) ?? 0
          return (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Link href={`/platform-admin/${r.orgId}`} className="font-medium hover:underline">
                    {r.org.name}
                  </Link>
                  <p className="text-xs text-gray-500">
                    requested by {r.requestedByName} ({r.requestedByEmail}) on {r.requestedAt.toLocaleDateString()}
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0 ${statusBadge[r.status]}`}>
                  {statusIcon[r.status]} {r.status}
                </span>
              </div>

              <div className="text-xs text-gray-600 space-y-0.5 pl-1">
                {r.legalEntityName && <p>Legal entity: {r.legalEntityName}</p>}
                {r.registrationNumber && <p>Registration #: {r.registrationNumber}</p>}
                {r.evidenceNotes && <p className="whitespace-pre-wrap">{r.evidenceNotes}</p>}
                {r.evidenceFileUrl && (
                  <a href={r.evidenceFileUrl} className="text-blue-600 hover:underline flex items-center gap-1.5">
                    <Download className="h-3 w-3" /> View uploaded evidence
                  </a>
                )}
                <p className={custodianCount < 2 ? "text-orange-600 font-medium" : "text-gray-500"}>
                  Custodians on file: {custodianCount} {custodianCount < 2 && "(needs at least 2 to approve)"}
                </p>
              </div>

              {r.status === "PENDING" && <VerificationRequestControls requestId={r.id} />}

              {r.status === "DENIED" && r.reviewNotes && (
                <p className="text-xs text-red-600 pl-1">Denied: &quot;{r.reviewNotes}&quot;</p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
