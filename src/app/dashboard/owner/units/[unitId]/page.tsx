import { Fragment } from "react"
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
import { duesPaymentDates, DUES_FREQUENCY_PER_YEAR } from "@/lib/dues"
import { UNIT_CHARGE_TYPE_LABEL } from "@/lib/charges"
import { DuesFrequencySelect } from "./dues-frequency-select"
import { AgmDocumentPreferenceSelect } from "./agm-document-preference-select"
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
          // Both ISSUED and DRAFT charges - DRAFT special assessments are
          // shown as forward-looking heads-up items, never counted toward
          // what's actually owed.
          assessmentCharges: {
            include: { assessment: true },
            orderBy: { assessment: { dueDate: "asc" } },
          },
          unitCharges: { orderBy: { dueDate: "asc" } },
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
  const estimatedAnnualDues = duesBudgetTotal != null ? duesBudgetTotal * (allocationPercent / 100) : null
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

  // Prefer what was actually billed - an ISSUED regular-dues assessment
  // charge, always in the org's base currency - over the estimate above,
  // which can drift from the real figure (e.g. it folds in budget lines
  // that are actually billed through a separate special assessment).
  const realDuesCharge =
    unit.assessmentCharges
      .filter((c) => c.assessment.type === "REGULAR_DUES" && c.assessment.status === "ISSUED")
      .sort((a, b) => b.assessment.dueDate.getTime() - a.assessment.dueDate.getTime())[0] ?? null
  const orgRate = org?.currentExchangeRate ?? duesBudgetRate

  const annualDuesPeso = realDuesCharge
    ? realDuesCharge.amountDue
    : estimatedAnnualDues != null
      ? pesoAmount(estimatedAnnualDues)
      : null
  const annualDuesUsd = realDuesCharge
    ? orgRate != null
      ? convertToSecondary(realDuesCharge.amountDue, orgRate, "MXN")
      : null
    : estimatedAnnualDues != null
      ? usdAmount(estimatedAnnualDues)
      : null

  const paymentsPerYear = DUES_FREQUENCY_PER_YEAR[unit.duesFrequency]
  const perPaymentPeso = annualDuesPeso != null ? annualDuesPeso / paymentsPerYear : null
  const perPaymentUsd = annualDuesUsd != null ? annualDuesUsd / paymentsPerYear : null
  const paymentAnchorYear =
    realDuesCharge?.assessment.dueDate.getUTCFullYear() ?? duesBudget?.year ?? new Date().getFullYear()
  // Month/day only (no year) - this same cadence applies to every year
  // shown, so the year belongs on the column header, not repeated per row.
  const paymentLabels = duesPaymentDates(unit.duesFrequency, paymentAnchorYear).map((d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
  )

  // Forward-looking preview off the proposed (not yet approved) budget, so
  // an owner can see next year's likely cost even before the Board
  // approves it - a distinct year, shown alongside the current one.
  const forwardBudget = proposedBudget && proposedBudget.year !== duesBudget?.year ? proposedBudget : null
  const forwardBudgetTotal = forwardBudget?.lineItems.reduce((s, i) => s + i.budgetedAmount, 0) ?? null
  const forwardAnnualEstimate =
    forwardBudgetTotal != null ? forwardBudgetTotal * (allocationPercent / 100) : null
  const forwardCurrency = (forwardBudget?.currency ?? "MXN") as Currency
  const forwardRate = forwardBudget?.exchangeRate ?? org?.currentExchangeRate ?? null
  const forwardPeso =
    forwardAnnualEstimate == null
      ? null
      : forwardCurrency === "MXN"
        ? forwardAnnualEstimate
        : forwardRate != null
          ? convertToSecondary(forwardAnnualEstimate, forwardRate, "USD")
          : null
  const forwardUsd =
    forwardAnnualEstimate == null
      ? null
      : forwardCurrency === "USD"
        ? forwardAnnualEstimate
        : forwardRate != null
          ? convertToSecondary(forwardAnnualEstimate, forwardRate, "MXN")
          : null
  const forwardPerPaymentPeso = forwardPeso != null ? forwardPeso / paymentsPerYear : null
  const forwardPerPaymentUsd = forwardUsd != null ? forwardUsd / paymentsPerYear : null

  // USD equivalent for a peso figure that doesn't already have one worked
  // out (Assessments and Charges are always in the org's base currency).
  const usdFor = (mxn: number): number | null => (orgRate != null ? convertToSecondary(mxn, orgRate, "MXN") : null)

  // Assessments: one-off special levies (a roof project, a cash call) -
  // distinct from recurring dues above. DRAFT ones are shown as a heads-up,
  // never counted toward what's actually owed.
  const specialCharges = unit.assessmentCharges
    .filter((c) => c.assessment.type === "SPECIAL")
    .sort((a, b) => a.assessment.dueDate.getTime() - b.assessment.dueDate.getTime())
  const duesOutstanding = realDuesCharge ? Math.max(realDuesCharge.amountDue - realDuesCharge.amountPaid, 0) : 0
  const specialOutstanding = specialCharges
    .filter((c) => c.assessment.status === "ISSUED")
    .reduce((s, c) => s + Math.max(c.amountDue - c.amountPaid, 0), 0)
  const chargeOutstanding = unit.unitCharges.reduce((s, c) => s + Math.max(c.amount - c.amountPaid, 0), 0)
  const totalOutstanding = duesOutstanding + specialOutstanding + chargeOutstanding

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
          <div className="flex items-center justify-between gap-3 border-t pt-3 mt-2">
            <div>
              <p className="text-gray-500">AGM package</p>
              <p className="text-xs text-gray-400">
                Which document &quot;Get your package&quot; gives you for the annual meeting
              </p>
            </div>
            <AgmDocumentPreferenceSelect unitId={unit.id} current={unit.agmDocumentPreference} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" /> Dues & Assessments
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-5">
          {/* Dues */}
          <div className="space-y-3">
            <div className="flex items-baseline justify-between">
              <p className="text-gray-500">Allocation share</p>
              <p className="font-semibold tabular-nums">{allocationPercent.toFixed(2)}%</p>
            </div>

            <div className="border-t pt-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-gray-500">Payment schedule</p>
                <DuesFrequencySelect unitId={unit.id} current={unit.duesFrequency} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {paymentsPerYear} payment{paymentsPerYear !== 1 ? "s" : ""} a year
              </p>
            </div>

            <div
              className={`grid gap-x-3 gap-y-1.5 border-t pt-3 ${forwardPeso != null ? "grid-cols-[minmax(72px,1fr)_auto_auto]" : "grid-cols-[minmax(72px,1fr)_auto]"}`}
            >
              <div />
              <p className="text-right text-xs font-medium text-gray-400 tabular-nums">{duesBudget?.year ?? "—"}</p>
              {forwardPeso != null && (
                <p className="text-right text-xs font-medium text-gray-400 tabular-nums">{forwardBudget?.year}</p>
              )}

              <p className="text-gray-700 font-medium">Annual dues</p>
              <p className="text-right tabular-nums">
                <span className="font-semibold">{fmtPeso(annualDuesPeso)}</span>
                <span className="block text-xs text-gray-400">{fmtUsd(annualDuesUsd)}</span>
              </p>
              {forwardPeso != null && (
                <p className="text-right tabular-nums">
                  <span className="font-semibold">{fmtPeso(forwardPeso)}</span>
                  <span className="block text-xs text-gray-400">{fmtUsd(forwardUsd)}</span>
                </p>
              )}

              {perPaymentPeso != null &&
                paymentLabels.map((label, i) => (
                  <Fragment key={label}>
                    <p className="text-gray-500 border-t pt-1.5">{label}</p>
                    <p className="text-right tabular-nums border-t pt-1.5">
                      <span>{fmtPeso(perPaymentPeso)}</span>
                      <span className="block text-xs text-gray-400">{fmtUsd(perPaymentUsd)}</span>
                    </p>
                    {forwardPerPaymentPeso != null && (
                      <p className="text-right tabular-nums border-t pt-1.5">
                        <span>{fmtPeso(forwardPerPaymentPeso)}</span>
                        <span className="block text-xs text-gray-400">{fmtUsd(forwardPerPaymentUsd)}</span>
                      </p>
                    )}
                  </Fragment>
                ))}
            </div>
            <p className="text-xs text-gray-400">
              {duesBudget?.year}
              {realDuesCharge ? " billed" : duesBudgetIsApproved ? " estimated" : duesBudget ? " proposed" : ""}
              {forwardBudget && `; ${forwardBudget.year} is from the proposed budget - not yet approved, for planning only`}
              .
            </p>

            <div className="border-t pt-2 flex items-baseline justify-between text-xs">
              <span className="text-gray-400">Currently outstanding</span>
              <span className={`font-medium tabular-nums ${duesOutstanding > 0.005 ? "text-red-600" : "text-green-700"}`}>
                {duesOutstanding > 0.005 ? formatMoney(duesOutstanding, "MXN") : "Paid up"}
              </span>
            </div>
          </div>

          {/* Assessments */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Assessments</p>
            {specialCharges.length === 0 && (
              <p className="text-gray-400">No special assessments for this unit.</p>
            )}
            {specialCharges.map((c) => {
              const outstanding = Math.max(c.amountDue - c.amountPaid, 0)
              const isDraft = c.assessment.status !== "ISSUED"
              return (
                <div key={c.id} className="flex items-start justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">{c.assessment.title}</p>
                    <p className="text-xs text-gray-400">
                      {isDraft ? "Proposed — not yet issued" : `Due ${formatDateTime(c.assessment.dueDate)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">{formatMoney(c.amountDue, "MXN")}</p>
                    <p className="text-xs text-gray-400 tabular-nums">{fmtUsd(usdFor(c.amountDue))}</p>
                    {!isDraft && (
                      <p className={`text-xs tabular-nums ${outstanding > 0.005 ? "text-red-600" : "text-green-700"}`}>
                        {outstanding > 0.005 ? `${formatMoney(outstanding, "MXN")} owed` : "Paid up"}
                      </p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Charges */}
          <div className="border-t pt-4 space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Charges</p>
            {unit.unitCharges.length === 0 && (
              <p className="text-gray-400">No other charges for this unit.</p>
            )}
            {unit.unitCharges.map((c) => {
              const outstanding = Math.max(c.amount - c.amountPaid, 0)
              return (
                <div key={c.id} className="flex items-start justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {UNIT_CHARGE_TYPE_LABEL[c.type]}
                      {c.label && ` — ${c.label}`}
                    </p>
                    <p className="text-xs text-gray-400">
                      {c.dueDate ? `Due ${formatDateTime(c.dueDate)}` : `Charged ${formatDateTime(c.chargedOn)}`}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-semibold tabular-nums">{formatMoney(c.amount, "MXN")}</p>
                    <p className="text-xs text-gray-400 tabular-nums">{fmtUsd(usdFor(c.amount))}</p>
                    <p className={`text-xs tabular-nums ${outstanding > 0.005 ? "text-red-600" : "text-green-700"}`}>
                      {outstanding > 0.005 ? `${formatMoney(outstanding, "MXN")} owed` : "Paid up"}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Overall standing */}
          <div className="border-t pt-4 flex items-baseline justify-between">
            <span className="text-gray-500">Total currently outstanding</span>
            <span className={`font-semibold tabular-nums ${totalOutstanding > 0.005 ? "text-red-600" : "text-green-700"}`}>
              {totalOutstanding > 0.005 ? formatMoney(totalOutstanding, "MXN") : "Paid up"}
            </span>
          </div>
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
