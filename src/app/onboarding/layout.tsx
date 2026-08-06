import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { db } from "@/lib/db"
import { OnboardingHeaderAccount } from "./header-account"
import { OrgDeletionBanner } from "@/components/dashboard/org-deletion-banner"

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ACCOUNT_OWNER") redirect("/dashboard")

  // An Account Owner still mid-setup can still be the target of a deletion
  // request (e.g. requested right after the org was created) - they need to
  // see it here too, not just once onboarding is done.
  const pendingDeletionRequest = session.user.orgId
    ? await db.orgDeletionRequest.findFirst({ where: { orgId: session.user.orgId, status: "PENDING" } })
    : null

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4 flex items-center justify-between">
        <Link href="/dashboard">
          <Image src="/HOPE-logo.png" alt="HOPE" height={40} width={140} className="object-contain" />
        </Link>
        <OnboardingHeaderAccount name={session.user.name ?? null} email={session.user.email ?? ""} />
      </header>
      <main className="max-w-2xl mx-auto py-12 px-4">
        {pendingDeletionRequest && (
          <OrgDeletionBanner
            requestId={pendingDeletionRequest.id}
            orgName={pendingDeletionRequest.orgName}
            canRespond={!pendingDeletionRequest.accountOwnerApprovedAt}
            alreadyApprovedByMe={pendingDeletionRequest.accountOwnerApprovedById === session.user.id}
          />
        )}
        {children}
      </main>
    </div>
  )
}
