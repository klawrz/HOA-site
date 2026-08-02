import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import {
  Building2, Users, Mail, ArrowRight, Wrench, FileText, ShieldCheck,
} from "lucide-react"
import { InvitePanel } from "./invite-panel"
import { PropertyAddressCard } from "./property-address-card"

export default async function AccountDashboardPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const org = await db.organization.findUnique({
    where: { id: session.user.orgId },
    include: {
      units: true,
      memberships: { where: { role: { not: "ACCOUNT_OWNER" } } },
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

      {/* Property address - shown on the public property home page */}
      <PropertyAddressCard
        address={{
          addressLine1: org.addressLine1,
          addressLine2: org.addressLine2,
          city: org.city,
          state: org.state,
          postalCode: org.postalCode,
          country: org.country,
        }}
      />

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <Link href="/dashboard/account/units" className="bg-white border rounded-xl p-5 hover:border-gray-300 transition-colors">
          <Building2 className="h-5 w-5 text-blue-600 mb-3" />
          <p className="text-2xl font-bold">{org.units.length}</p>
          <p className="text-sm text-gray-500">Units</p>
        </Link>
        <div className="bg-white border rounded-xl p-5">
          <Users className="h-5 w-5 text-green-600 mb-3" />
          <p className="text-2xl font-bold">{org.memberships.length}</p>
          <p className="text-sm text-gray-500">Members</p>
        </div>
        <div className="bg-white border rounded-xl p-5">
          <Mail className="h-5 w-5 text-purple-600 mb-3" />
          <p className="text-2xl font-bold">{pendingInvites.length}</p>
          <p className="text-sm text-gray-500">Pending Invites</p>
        </div>
      </div>

      {/* Manage - every module the Account Owner has authority over */}
      <div className="space-y-3">
        <h2 className="font-semibold text-gray-700">Manage</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            { href: "/dashboard/account/units", icon: Building2, color: "text-blue-600", label: "Units", desc: "Add, edit, and configure units" },
            { href: "/dashboard/account/members", icon: Users, color: "text-green-600", label: "Members", desc: "View all org members and roles" },
            { href: "/dashboard/account/pm", icon: Wrench, color: "text-purple-600", label: "Property Manager", desc: "Contracted PM company and contract" },
            { href: "/dashboard/account/contracts", icon: FileText, color: "text-indigo-600", label: "Contracts", desc: "Property-level vendor contracts" },
            { href: "/dashboard/account/contractors", icon: Wrench, color: "text-orange-600", label: "Contractors", desc: "Directory by service type" },
            { href: "/dashboard/account/compliance", icon: ShieldCheck, color: "text-teal-600", label: "Compliance", desc: "Bylaws, filings, insurance, permits" },
          ].map((m) => (
            <Link
              key={m.href}
              href={m.href}
              className="flex items-center justify-between bg-white border rounded-xl p-4 hover:border-gray-300 transition-colors group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <m.icon className={`h-5 w-5 shrink-0 ${m.color}`} />
                <div className="min-w-0">
                  <p className="font-medium text-sm">{m.label}</p>
                  <p className="text-xs text-gray-400 truncate">{m.desc}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600 shrink-0" />
            </Link>
          ))}
        </div>
      </div>

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
    </div>
  )
}
