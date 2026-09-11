import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { canPreviewRole } from "@/lib/role-access"
import { getAgmPacketData } from "@/lib/agm"
import { EmailPreview } from "@/components/agm/email-preview"

export default async function CoverEmailPage() {
  const session = await auth()
  const canManage =
    session?.user &&
    (canPreviewRole(session.user.role, "BOARD_MEMBER") ||
      canPreviewRole(session.user.role, "PROPERTY_MANAGER") ||
      session.user.isBoardMember === true)
  if (!session || !canManage) redirect("/dashboard")

  const data = await getAgmPacketData(session.user.orgId ?? "")
  if (!data) redirect("/dashboard/board/agm")

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <div>
        <Link
          href="/dashboard/board/agm"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to the AGM
        </Link>
        <h1 className="text-xl font-bold">Informative-package cover email</h1>
        <p className="text-sm text-gray-500">
          Bilingual, Spanish first — mirrors the {data.agm.year - 1} kickoff email. Fill the proxy
          contact in AGM details, paste the Zoom block, then copy into your mail client.
        </p>
      </div>
      <EmailPreview
        subject={data.email.subject}
        bodyEs={data.email.bodyEs}
        bodyEn={data.email.bodyEn}
        zoomInfo={data.agm.zoomInfo}
      />
    </div>
  )
}
