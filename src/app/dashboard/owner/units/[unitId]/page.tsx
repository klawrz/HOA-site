import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect, notFound } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDateTime } from "@/lib/utils"
import { UnitContacts } from "./unit-contacts"
import { UnitManagers } from "./unit-managers"
import { UserCog, Phone, Mail } from "lucide-react"
import { ContractList } from "@/components/contracts/contract-list"
import { NewContractDialog } from "@/components/contracts/new-contract-dialog"
import { OccupancyCalendar } from "@/components/occupancy/occupancy-calendar"
import { OccupancyVisibilityForm } from "./occupancy-visibility-form"
import { ShareLinksPanel } from "./share-links-panel"
import { parseSpecialties } from "@/lib/unit-manager-specialties"
import { getUnitLabel, unitDisplayName, unitAddressLines } from "@/lib/unit-label"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { convertToSecondary, formatMoney } from "@/lib/currency"
import { perPaymentDues, DUES_FREQUENCY_PER_YEAR } from "@/lib/dues"
import { DuesFrequencySelect } from "./dues-frequency-select"
import { Currency } from "@/generated/prisma"
import { Receipt } from "lucide-react"
import Link from "next/link"
import { OnboardingStepTracker } from "@/components/onboarding/onboarding-step-tracker"
import { parseCompletedSteps } from "@/lib/onboarding-steps"
import { getImportedUnitContactData } from "@/app/actions/unit-profile"
import { ImportedContactPrompt } from "./imported-contact-prompt"
import { ConfirmTransferButton } from "@/components/units/confirm-transfer-button"

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId } = await params
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")

  const ownership = await db.unitOwnership.findFirst({
    where: { unitId, ownerId: session.user.id, isCurrent: true },
    include: {
      unit: {
        include: {
          contacts: true,
          managers: { include: { user: true, grants: true } },
          contracts: { include: { contractor: true }, orderBy: { createdAt: "desc" } },
          occupancyEntries: { orderBy: { startDate: "asc" } },
          leases: { where: { isActive: true }, include: { renter: true }, take: 1 },
          occupancyShareLinks: { where: { revokedAt: null }, orderBy: { createdAt: "desc" } },
        },
      },
    },
  })

  if (!ownership) notFound()

  const { unit } = ownership
  const activeLease = unit.leases[0]

  const [contractorMemberships, org, unitLabel, orgUnits, approvedBudget, proposedBudget, ownMembership] = await Promise.all([
    db.membership.findMany({
      where: { orgId: session.user.orgId ?? undefined, role: "CONTRACTOR" },
      include: { user: true },
      orderBy: { user: { name: "asc" } },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    getUnitLabel(session.user.orgId),
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      select: { id: true, allocationPercent: true },
    }),
    db.budget.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: { year: "desc" },
    }),
    // Fallback when nothing is approved yet - the current proposed budget,
    // clearly labelled so owners know the figure isn't final.
    db.budget.findFirst({
      where: { orgId: session.user.orgId ?? undefined, status: "DRAFT", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    }),
    db.membership.findUnique({
      where: { userId_orgId: { userId: session.user.id, orgId: session.user.orgId ?? "" } },
      select: { onboardingSteps: true },
    }),
  ])
  const onboardingStepDone = parseCompletedSteps(ownMembership?.onboardingSteps ?? null).has("unit")
  const contractors = contractorMemberships.map((m) => m.user)
  const unitName = unitDisplayName(unitLabel, unit.number, unit.building)

  const allocationPercent = effectiveAllocations(orgUnits).get(unit.id) ?? 0
  const duesBudget = approvedBudget ?? proposedBudget
  const duesBudgetTotal = duesBudget?.lineItems.reduce((s, i) => s + i.budgetedAmount, 0) ?? null
  const duesBudgetCurrency = (duesBudget?.currency ?? org?.baseCurrency ?? "USD") as Currency
  const duesBudgetRate = duesBudget?.exchangeRate ?? org?.currentExchangeRate ?? null
  const duesBudgetIsApproved = !!approvedBudget
  const duesBudgetLabel = duesBudget
    ? duesBudgetIsApproved
      ? `${duesBudget.year} approved operating budget`
      : `Proposed ${duesBudget.periodLabel || duesBudget.year} — not yet approved`
    : "Operating budget — not yet set"
  const annualDues = duesBudgetTotal != null ? duesBudgetTotal * (allocationPercent / 100) : null
  // Show pesos and US$ side by side regardless of which is the budget's base.
  const pesoAmount = (nBase: number): number | null =>
    duesBudgetCurrency === "MXN"
      ? nBase
      : duesBudgetRate != null
        ? convertToSecondary(nBase, duesBudgetRate, "USD")
        : null
  const usdAmount = (nBase: number): number | null =>
    duesBudgetCurrency === "USD"
      ? nBase
      : duesBudgetRate != null
        ? convertToSecondary(nBase, duesBudgetRate, "MXN")
        : null
  const fmtPeso = (n: number | null) => (n != null ? formatMoney(n, "MXN") : "—")
  const fmtUsd = (n: number | null) => (n != null ? formatMoney(n, "USD") : "—")
  const perPayment = annualDues != null ? perPaymentDues(annualDues, unit.duesFrequency) : null
  const paymentsPerYear = DUES_FREQUENCY_PER_YEAR[unit.duesFrequency]

  // A shared directory, same as the Contractor directory below - anyone who
  // has ever become a Unit Manager (via invite or assignment elsewhere) and
  // opted into directoryVisible is visible here so other Owners can pick
  // them instead of typing an email blind.
  const unitManagerMemberships = await db.membership.findMany({
    where: { role: "UNIT_MANAGER", user: { directoryVisible: true } },
    include: { user: true },
    orderBy: { user: { name: "asc" } },
  })
  const unitManagerDirectory = unitManagerMemberships.map((m) => m.user)
  const importedContactData = await getImportedUnitContactData(unit.id)

  // A pending transfer this owner still needs to confirm they're divesting -
  // shown right on the unit itself, not just the home page banner, since
  // this is exactly the unit it's about.
  const pendingSellerConfirmation = await db.ownershipTransferSellerConfirmation.findFirst({
    where: { ownerId: session.user.id, confirmedAt: null, request: { unitId: unit.id, status: "PENDING" } },
    include: { request: true },
  })

  return (
    <div className="max-w-2xl space-y-4">
      <OnboardingStepTracker stepId="unit" alreadyComplete={onboardingStepDone} />
      {importedContactData && <ImportedContactPrompt unitId={unit.id} data={importedContactData} />}
      {pendingSellerConfirmation && (
        <div className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-sm text-amber-800">
            This unit is being transferred to {pendingSellerConfirmation.request.newOwnerName}, effective{" "}
            {formatDateTime(pendingSellerConfirmation.request.since)}. Confirm you&apos;re divesting to proceed.
          </p>
          <ConfirmTransferButton requestId={pendingSellerConfirmation.request.id} />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold">{unitName}</h1>
        <p className="text-gray-500 mt-1">
          Owned since {formatDateTime(ownership.since)}
        </p>
      </div>

      {unit.managers.length > 0 && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-teal-800 flex items-center gap-1.5 mb-2">
            <UserCog className="h-3.5 w-3.5" /> Unit Manager
          </p>
          <div className="space-y-2">
            {unit.managers.map((m) => {
              const name = m.user?.name ?? m.name
              const phone = m.user?.phone ?? m.phone
              const email = m.user?.email ?? m.email
              return (
                <div key={m.id}>
                  <p className="font-semibold text-teal-900">{name ?? email}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-sm text-teal-800">
                    {phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3.5 w-3.5" /> {phone}
                      </span>
                    )}
                    {email && (
                      <span className="flex items-center gap-1">
                        <Mail className="h-3.5 w-3.5" /> {email}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex gap-4 text-gray-500">
            {unit.bedrooms && <span>{unit.bedrooms} bed</span>}
            {unit.bathrooms && <span>{unit.bathrooms} bath</span>}
            {unit.sqft && <span>{unit.sqft.toLocaleString()} sqft</span>}
          </div>
          {(() => {
            const { unitName: name, propertyLines } = unitAddressLines(org ?? {
              addressLine1: null, addressLine2: null, city: null, state: null, postalCode: null, country: null,
            }, unitName)
            return (
              <div>
                <p className="font-medium text-gray-700">{name}</p>
                {propertyLines.length > 0 ? (
                  propertyLines.map((line, i) => <p key={i}>{line}</p>)
                ) : (
                  <p className="text-gray-400">
                    Property address not on file - the Account Holder can add one from the dashboard.
                  </p>
                )}
              </div>
            )
          })()}
          {unit.civicRoll && (
            <p className="text-xs text-gray-400 pt-1">Civic Roll Number: {unit.civicRoll}</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" /> Dues & Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          <div className="flex items-baseline justify-between">
            <p className="text-gray-500">Allocation share</p>
            <p className="font-semibold tabular-nums">{allocationPercent.toFixed(2)}%</p>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Owner-approved share of the common budget</p>

          <div className="flex items-center justify-between gap-3 mt-3 border-t pt-3">
            <div>
              <p className="text-gray-500">Payment schedule</p>
              <p className="text-xs text-gray-400">How you pay your dues — {paymentsPerYear} payment{paymentsPerYear !== 1 ? "s" : ""} a year</p>
            </div>
            <DuesFrequencySelect unitId={unit.id} current={unit.duesFrequency} />
          </div>

          <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5">
            <div />
            <p className="text-right text-xs font-medium uppercase tracking-wide text-gray-400">Pesos (MXN)</p>
            <p className="text-right text-xs font-medium uppercase tracking-wide text-gray-400">US$</p>

            <p className="text-gray-500">{duesBudgetLabel}</p>
            <p className="text-right tabular-nums">{duesBudgetTotal != null ? fmtPeso(pesoAmount(duesBudgetTotal)) : "—"}</p>
            <p className="text-right tabular-nums">{duesBudgetTotal != null ? fmtUsd(usdAmount(duesBudgetTotal)) : "—"}</p>

            {annualDues != null && (
              <>
                <p className="text-gray-500 border-t pt-1.5">This unit&apos;s dues — annual</p>
                <p className="text-right font-semibold tabular-nums border-t pt-1.5">{fmtPeso(pesoAmount(annualDues))}</p>
                <p className="text-right font-semibold tabular-nums border-t pt-1.5">{fmtUsd(usdAmount(annualDues))}</p>

                <p className="text-gray-500">Each payment ({paymentsPerYear}&times;/yr)</p>
                <p className="text-right font-semibold tabular-nums">{fmtPeso(pesoAmount(perPayment!))}</p>
                <p className="text-right font-semibold tabular-nums">{fmtUsd(usdAmount(perPayment!))}</p>
              </>
            )}
          </div>

          {annualDues != null && (
            <p className="text-xs text-gray-400 pt-2">
              {allocationPercent.toFixed(2)}% of the {duesBudgetIsApproved ? "approved" : "proposed"}{" "}
              operating budget
              {duesBudgetRate != null && `, converted at ${duesBudgetRate} MXN / USD`}
              {!duesBudgetIsApproved && " — final once the budget is approved"}.
            </p>
          )}
          <Link
            href="/dashboard/owner/financial/dues"
            className="text-xs text-blue-600 hover:underline inline-block pt-2"
          >
            View full dues & assessments
          </Link>
        </CardContent>
      </Card>

      <Card id="occupancy-calendar">
        <CardHeader>
          <CardTitle className="text-base">Occupancy Calendar</CardTitle>
          <p className="text-xs text-gray-400">
            Log who&apos;s staying and when - your own family, a trusted guest, a renter, or vacant.
          </p>
        </CardHeader>
        <CardContent>
          <OccupancyCalendar
            unitId={unit.id}
            entries={unit.occupancyEntries}
            canManage
            activeLease={
              activeLease
                ? { renterName: activeLease.renter.name, startDate: activeLease.startDate, endDate: activeLease.endDate }
                : null
            }
          />
        </CardContent>
      </Card>

      <OccupancyVisibilityForm
        ownershipId={ownership.id}
        visibleToBoard={ownership.occupancyVisibleToBoard}
        visibleToPM={ownership.occupancyVisibleToPM}
        poolMember={ownership.rentalPoolMember}
        occupancyPolicy={org?.occupancyVisibilityPolicy ?? null}
        poolGuidelines={org?.rentalPoolGuidelines ?? null}
      />

      <ShareLinksPanel
        unitId={unit.id}
        links={unit.occupancyShareLinks.map((l) => ({ id: l.id, token: l.token, label: l.label }))}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Contacts</CardTitle>
        </CardHeader>
        <CardContent>
          <UnitContacts unitId={unit.id} contacts={unit.contacts} />
        </CardContent>
      </Card>

      <Card id="unit-manager">
        <CardHeader>
          <CardTitle className="text-base">Unit Manager</CardTitle>
          <p className="text-xs text-gray-400">
            Delegate guests, cleaning, tickets, or occupancy access. You control what they can do.
          </p>
        </CardHeader>
        <CardContent>
          <UnitManagers
            unitId={unit.id}
            managers={unit.managers.map((m) => ({
              id: m.id,
              name: m.user?.name ?? m.name,
              email: m.user?.email ?? m.email,
              phone: m.user?.phone ?? m.phone,
              notes: m.notes,
              hasAccount: !!m.user,
              grants: m.grants.map((g) => ({ area: g.area, level: g.level })),
            }))}
            directory={unitManagerDirectory
              .filter((u) => !unit.managers.some((m) => m.user?.email === u.email))
              .map((u) => ({
                name: u.name,
                email: u.email,
                company: u.company,
                headline: u.headline,
                bio: u.bio,
                phone: u.phone,
                yearsExperience: u.yearsExperience,
                specialties: parseSpecialties(u.specialties),
              }))}
            selfManaged={unit.selfManaged}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between flex-row">
          <CardTitle className="text-base">Contracts</CardTitle>
          <NewContractDialog scope="unit" unitId={unit.id} contractors={contractors} />
        </CardHeader>
        <CardContent>
          <ContractList contracts={unit.contracts} canManage />
        </CardContent>
      </Card>
    </div>
  )
}
