import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, ShieldCheck, Clock, XCircle } from "lucide-react"
import { db } from "@/lib/db"
import { VerificationRequestForm } from "./verification-request-form"

export default async function VerificationPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    select: { name: true, verificationStatus: true, verifiedAt: true },
  })
  if (!org) redirect("/login")

  const latestRequest = await db.orgVerificationRequest.findFirst({
    where: { orgId: session.user.orgId },
    orderBy: { requestedAt: "desc" },
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Link href="/dashboard/account" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Account
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-gray-900">Workspace Verification</h1>
        <p className="text-gray-500 mt-1">
          Verification is what turns a self-serve workspace into {org.name}&apos;s official system of record.
        </p>
      </div>

      {org.verificationStatus === "VERIFIED" ? (
        <div className="bg-white border rounded-xl p-6 text-center space-y-2">
          <ShieldCheck className="h-8 w-8 text-green-600 mx-auto" />
          <p className="font-medium">This organization is verified</p>
          <p className="text-sm text-gray-500">
            Verified {org.verifiedAt?.toLocaleDateString()}.
          </p>
        </div>
      ) : latestRequest?.status === "PENDING" ? (
        <div className="bg-white border rounded-xl p-6 text-center space-y-2">
          <Clock className="h-8 w-8 text-orange-500 mx-auto" />
          <p className="font-medium">Verification request pending review</p>
          <p className="text-sm text-gray-500">
            Submitted {latestRequest.requestedAt.toLocaleDateString()}. A platform admin will follow up.
          </p>
        </div>
      ) : (
        <>
          {latestRequest?.status === "DENIED" && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
              <XCircle className="h-4 w-4 text-red-600 mt-0.5 shrink-0" />
              <div className="text-sm text-red-700">
                <p className="font-medium">Your previous request was denied</p>
                {latestRequest.reviewNotes && <p className="mt-0.5">&quot;{latestRequest.reviewNotes}&quot;</p>}
              </div>
            </div>
          )}
          <VerificationRequestForm orgName={org.name} />
        </>
      )}
    </div>
  )
}
