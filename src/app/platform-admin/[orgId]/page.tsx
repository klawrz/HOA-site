import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { db } from "@/lib/db"
import { requirePlatformAdmin } from "@/lib/require-platform-admin"
import { OrgNameForm } from "./org-name-form"
import { OrgInvitePanel } from "./org-invite-panel"
import { OrgAddressCard } from "./org-address-card"
import { AccountBillingCard } from "./account-billing-card"
import { AccountOwnerDataCard } from "./account-owner-data-card"
import { PropertyManagerCard } from "./property-manager-card"
import { DangerZone } from "./danger-zone"
import { compareUnitNumbers } from "@/lib/unit-label"

export default async function PlatformAdminOrgDetailPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const session = await requirePlatformAdmin()
  if (!session) notFound()

  const { orgId } = await params

  const [org, activePMContract, latestDeletionRequest] = await Promise.all([
    db.organization.findUnique({
      where: { id: orgId },
      include: {
        memberships: { include: { user: true }, orderBy: { createdAt: "asc" } },
        invites: { orderBy: { createdAt: "desc" } },
        units: { select: { id: true, number: true } },
      },
    }),
    db.pMContract.findFirst({
      where: { orgId, status: "ACTIVE" },
      include: { company: true },
      orderBy: { startDate: "desc" },
    }),
    db.orgDeletionRequest.findFirst({ where: { orgId }, orderBy: { requestedAt: "desc" } }),
  ])
  if (!org) notFound()
  org.units.sort(compareUnitNumbers)

  return (
    <div className="max-w-2xl space-y-6">
      <Link href="/platform-admin" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Organizations
      </Link>

      {/* Mirrors the New Organization wizard's step order/labels (Account ->
          Basic Data -> Account Owner Data) so a platform admin sees the same
          structure reviewing an org here as they did creating it. */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account</h2>
        <OrgNameForm orgId={org.id} initialName={org.name} />
        <p className="text-xs text-gray-500">
          {org.onboardingComplete ? "Onboarded" : "Pending onboarding"} · created{" "}
          {org.createdAt.toLocaleDateString()}
          {org.suspendedAt && <span className="text-red-600 font-medium"> · Suspended</span>}
        </p>
        <AccountBillingCard
          orgId={org.id}
          createdAt={org.createdAt}
          billing={{
            accountNumber: org.accountNumber,
            pricingPlan: org.pricingPlan,
            billingExpiry: org.billingExpiry,
          }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Basic Data</h2>
        <OrgAddressCard
          orgId={org.id}
          address={{
            addressLine1: org.addressLine1,
            addressLine2: org.addressLine2,
            city: org.city,
            state: org.state,
            postalCode: org.postalCode,
            country: org.country,
          }}
        />
      </div>

      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Account Owner Data</h2>
        <AccountOwnerDataCard
          orgId={org.id}
          data={{
            accountOwnerName: org.accountOwnerName,
            accountOwnerTitle: org.accountOwnerTitle,
            accountOwnerEmail: org.accountOwnerEmail,
            accountOwnerPhone: org.accountOwnerPhone,
            accountOwnerAddressLine1: org.accountOwnerAddressLine1,
            accountOwnerAddressLine2: org.accountOwnerAddressLine2,
            accountOwnerCity: org.accountOwnerCity,
            accountOwnerState: org.accountOwnerState,
            accountOwnerPostalCode: org.accountOwnerPostalCode,
            accountOwnerCountry: org.accountOwnerCountry,
            altContactName: org.altContactName,
            altContactEmail: org.altContactEmail,
            altContactPhone: org.altContactPhone,
          }}
        />
      </div>

      <PropertyManagerCard company={activePMContract?.company ?? null} />

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
        unitLabel={org.unitLabel}
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

      <DangerZone
        orgId={org.id}
        orgName={org.name}
        suspended={!!org.suspendedAt}
        latestDeletionRequest={latestDeletionRequest}
      />
    </div>
  )
}
