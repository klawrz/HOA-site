import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { OrgNameForm } from "./org-name-form"
import { OrgInvitePanel } from "./org-invite-panel"

export default async function PlatformAdminOrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const session = await requirePlatformAdmin()
  if (!session) notFound()

  const { orgId } = await params

  const org = await db.organization.findUnique({
    where: { id: orgId },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
      invites: { orderBy: { createdAt: "desc" } },
      units: { select: { id: true, number: true }, orderBy: { number: "asc" } },
    },
  })
  if (!org) notFound()

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/platform-admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
      </Link>

      <div className="space-y-2">
        <OrgNameForm orgId={org.id} initialName={org.name} />
        <p className="text-xs text-gray-500">
          {org.slug} · {org.onboardingComplete ? "Onboarded" : "Pending onboarding"} · created{" "}
          {org.createdAt.toLocaleDateString()}
        </p>
      </div>

      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Members ({org.memberships.length})</h2>
        <div className="bg-white border rounded-xl divide-y">
          {org.memberships.length === 0 && (
            <p className="p-4 text-sm text-gray-500">No members yet.</p>
          )}
          {org.memberships.map((m) => (
            <div key={m.id} className="p-4 flex items-center justify-between">
              <div>
                <p className="font-medium text-sm">{m.user.name ?? m.user.email}</p>
                <p className="text-xs text-gray-500">{m.user.email}</p>
              </div>
              <span className="text-xs text-gray-500">
                {m.role.replace(/_/g, " ")}
                {m.isBoardMember ? " · Board" : ""}
              </span>
            </div>
          ))}
        </div>
      </div>

      <OrgInvitePanel
        orgId={org.id}
        units={org.units}
        invites={org.invites.map((i) => ({
          id: i.id,
          email: i.email,
          role: i.role,
          token: i.token,
          acceptedAt: i.acceptedAt,
        }))}
        baseUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
      />
    </div>
  )
}
