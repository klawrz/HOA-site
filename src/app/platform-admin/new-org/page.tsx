import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { NewOrgWizard } from "./new-org-wizard"

export default async function NewOrgPage({
  searchParams,
}: {
  searchParams: Promise<{ orgName?: string; referralId?: string }>
}) {
  const { orgName, referralId } = await searchParams
  return (
    <div className="space-y-6">
      <Link href="/platform-admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
      </Link>
      <div>
        <h1 className="text-2xl font-bold">New organization</h1>
        <p className="text-gray-500 mt-1">Set up a new HOA, its Account Owner login, and their basic details.</p>
      </div>
      <NewOrgWizard
        baseUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
        initialOrgName={orgName}
        referralId={referralId}
      />
    </div>
  )
}
