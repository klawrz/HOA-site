import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Building2, Users, Mail, ArrowRight, CheckCircle2, Circle } from "lucide-react"
import { InvitePanel } from "./invite-panel"

export default async function AccountDashboardPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    include: {
      units: true,
      members: { where: { role: { not: "ACCOUNT_OWNER" } } },
      invites: { orderBy: { createdAt: "desc" } },
    },
  })
  if (!org) redirect("/login")

  const pendingInvites = org.invites.filter((i) => !i.acceptedAt)
  const acceptedInvites = org.invites.filter((i) => i.acceptedAt)

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{org.name}</h1>
        <p className="text-gray-500 text-sm mt-1">Account Owner Dashboard</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/dashboard/account/units" className="bg-white border rounded-xl p-5 hover:border-gray-300 transition-colors">
          <Building2 className="h-5 w-5 text-blue-600 mb-3" />
          <p className="text-2xl font-bold">{org.units.length}</p>
          <p className="text-sm text-gray-500">Units</p>
        </Link>
        <div className="bg-white border rounded-xl p-5">
          <Users className="h-5 w-5 text-green-600 mb-3" />
          <p className="text-2xl font-bold">{org.members.length}</p>
          <p className="text-sm text-gray-500">Members</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <Mail className="h-5 w-5 text-purple-600 mb-3" />
          <p className="text-2xl font-bold">{pendingInvites.length}</p>
          <p className="text-sm text-gray-500">Pending Invites</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Invite panel */}
        <InvitePanel
          units={org.units.map((u) => ({ id: u.id, number: u.number }))}
          invites={org.invites.map((i) => ({
            id: i.id,
            email: i.email,
            role: i.role,
            token: i.token,
            acceptedAt: i.acceptedAt,
          }))}
          baseUrl={process.env.NEXTAUTH_URL ?? "http://localhost:3000"}
        />

        {/* Quick links */}
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-700">Manage</h2>
          <Link
            href="/dashboard/account/units"
            className="flex items-center justify-between bg-white border rounded-xl p-4 hover:border-gray-300 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Building2 className="h-5 w-5 text-blue-600" />
              <div>
                <p className="font-medium text-sm">Units</p>
                <p className="text-xs text-gray-400">Add, edit, and configure units</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>
          <Link
            href="/dashboard/account/members"
            className="flex items-center justify-between bg-white border rounded-xl p-4 hover:border-gray-300 transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-green-600" />
              <div>
                <p className="font-medium text-sm">Members</p>
                <p className="text-xs text-gray-400">View all org members and roles</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </Link>
        </div>
      </div>
    </div>
  )
}
