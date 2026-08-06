import Link from "next/link"
import { ChevronRight } from "lucide-react"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"

export default async function PlatformAdminPage() {
  const [orgs, newReferralCount] = await Promise.all([
    db.organization.findMany({
      include: {
        _count: {
          select: { memberships: true, units: true, invites: { where: { acceptedAt: null } } },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.pMReferral.count({ where: { status: "NEW" } }),
  ])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-gray-500 mt-1">Every HOA org provisioned on HOPE. Click one to manage it.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/platform-admin/referrals">
            <Button variant="outline">
              Referrals{newReferralCount > 0 ? ` (${newReferralCount})` : ""}
            </Button>
          </Link>
          <Link href="/platform-admin/deletion-requests">
            <Button variant="outline">Deletion Requests</Button>
          </Link>
          <Link href="/platform-admin/new-org">
            <Button>New organization</Button>
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {orgs.length === 0 && <p className="p-6 text-sm text-gray-500">No organizations yet.</p>}
        {orgs.map((org) => (
          <Link
            key={org.id}
            href={`/platform-admin/${org.id}`}
            className="p-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
          >
            <div>
              <p className="font-medium">{org.name}</p>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-4">
              <span>{org._count.memberships} members</span>
              <span>{org._count.units} units</span>
              {org._count.invites > 0 && (
                <span className="text-purple-700">{org._count.invites} pending invite{org._count.invites !== 1 ? "s" : ""}</span>
              )}
              <span className={org.onboardingComplete ? "text-green-700" : "text-orange-600"}>
                {org.onboardingComplete ? "Onboarded" : "Pending onboarding"}
              </span>
              {org.suspendedAt && <span className="text-red-600 font-medium">Suspended</span>}
              <ChevronRight className="h-4 w-4 text-gray-300" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
