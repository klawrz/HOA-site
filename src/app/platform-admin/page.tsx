import Link from "next/link"
import { db } from "@/lib/db"
import { Button } from "@/components/ui/button"

export default async function PlatformAdminPage() {
  const orgs = await db.organization.findMany({
    include: { _count: { select: { memberships: true, units: true } } },
    orderBy: { createdAt: "desc" },
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Organizations</h1>
          <p className="text-gray-500 mt-1">Every HOA org provisioned on HOPE.</p>
        </div>
        <Link href="/platform-admin/new-org">
          <Button>New organization</Button>
        </Link>
      </div>

      <div className="bg-white rounded-xl border divide-y">
        {orgs.length === 0 && <p className="p-6 text-sm text-gray-500">No organizations yet.</p>}
        {orgs.map((org) => (
          <div key={org.id} className="p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{org.name}</p>
              <p className="text-xs text-gray-500">{org.slug}</p>
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-4">
              <span>{org._count.memberships} members</span>
              <span>{org._count.units} units</span>
              <span className={org.onboardingComplete ? "text-green-700" : "text-orange-600"}>
                {org.onboardingComplete ? "Onboarded" : "Pending onboarding"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
