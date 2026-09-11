import { Fragment } from "react"
import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import Link from "next/link"
import {
  ArrowLeft,
  Home,
  UserCog,
  Phone,
  Mail,
  KeyRound,
  Receipt,
  Wrench,
  CalendarDays,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { UnitOwnersEditor } from "@/components/units/unit-owners-editor"
import { canPreviewRole } from "@/lib/role-access"
import { getUnitLabel, unitDisplayName, unitAddressLines } from "@/lib/unit-label"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { convertToSecondary, formatMoney } from "@/lib/currency"
import { duesPaymentDates, DUES_FREQUENCY_PER_YEAR, DUES_FREQUENCY_LABEL } from "@/lib/dues"
import { UNIT_CHARGE_TYPE_LABEL } from "@/lib/charges"
import { occupancyTypeLabel, occupancyTypeColor } from "@/lib/occupancy-styles"
import { formatDate } from "@/lib/utils"
import { Currency } from "@/generated/prisma"

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OWNER_OCCUPIED: "bg-blue-100 text-blue-700",
  RENTED: "bg-yellow-100 text-yellow-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
}

const ticketStatusColors: Record<string, string> = {
  ACTIVE: "bg-red-100 text-red-700",
  DEFERRED: "bg-amber-100 text-amber-700",
  CLOSED: "bg-green-100 text-green-700",
}

const rentalPolicyLabel: Record<string, string> = {
  ANYONE: "Rents to anyone",
  FRIENDS_FAMILY_ONLY: "Friends & family only",
  SHORT_TERM_RENTAL: "Short-term rental",
  NOT_RENTING: "Not renting",
}

// A read-only, whole-picture view of a single unit for Board Members and
// the Property Manager (same page, same URL - PM's units list links here
// too) - ownership, physical facts, dues standing, occupancy (only where
// the owner has shared it), the unit manager, and open maintenance. Every
// action (transfers, editing, occupancy logging) stays on the pages that
// own it; this page never mutates anything.
export default async function BoardUnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId } = await params
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")
  const isPmViewer = session.user.role === "PROPERTY_MANAGER" && !session.user.isBoardMember
  if (
    !canPreviewRole(session.user.role, "BOARD_MEMBER") &&
    !canPreviewRole(session.user.role, "PROPERTY_MANAGER") &&
    !session.user.isBoardMember
  ) {
    redirect("/dashboard")
  }
  // Same layout for Board and PM - just the surrounding nav differs.
  const basePath = isPmViewer ? "/dashboard/property-manager" : "/dashboard/board"

  const [unit, unitLabel, org, orgUnits, approvedBudget, proposedBudget] = await Promise.all([
    db.unit.findFirst({
      // Scope by org as well as id so a Board Member can never open a unit
      // that belongs to a different HOA by guessing its id.
      where: { id: unitId, orgId: session.user.orgId },
      include: {
        ownerships: { where: { isCurrent: true }, include: { owner: true } },
        managers: { include: { user: true, grants: true } },
        leases: { where: { isActive: true }, include: { renter: true }, take: 1 },
        occupancyEntries: { orderBy: { startDate: "asc" } },
        tickets: { orderBy: { createdAt: "desc" } },
        // Both ISSUED and DRAFT charges - DRAFT special assessments are
        // shown as forward-looking heads-up items, just never counted
        // toward what's actually owed.
        assessmentCharges: {
          include: { assessment: true },
          orderBy: { assessment: { dueDate: "asc" } },
        },
        unitCharges: { orderBy: { dueDate: "asc" } },
        ownershipTransferRequests: {
          where: { status: "PENDING" },
          include: { sellerConfirmations: { include: { owner: true } }, invite: true },
          take: 1,
        },
      },
    }),
    getUnitLabel(session.user.orgId),
    db.organization.findUnique({ where: { id: session.user.orgId } }),
    db.unit.findMany({
      where: { orgId: session.user.orgId },
      select: { id: true, allocationPercent: true },
    }),
    db.budget.findFirst({
      where: { orgId: session.user.orgId, status: "APPROVED", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: { year: "desc" },
    }),
    db.budget.findFirst({
      where: { orgId: session.user.orgId, status: "DRAFT", type: "OPERATING" },
      include: { lineItems: true },
      orderBy: [{ year: "desc" }, { updatedAt: "desc" }],
    }),
  ])

  if (!unit) notFound()

  const unitName = unitDisplayName(unitLabel, unit.number, unit.building)
  const primaryOwnership = unit.ownerships[0] ?? null
  const earliestSince = unit.ownerships.reduce<Date | null>(
    (min, o) => (min === null || o.since < min ? o.since : min),
    null
  )
  const activeLease = unit.leases[0] ?? null
  const pending = unit.ownershipTransferRequests[0] ?? null

  // --- dues, assessments & charges ------------------------------------------
  // Three distinct kinds of money this unit can owe, shown as three
  // separate elements rather than one lumped "financial standing" figure:
  // recurring Dues (Assessment type REGULAR_DUES), one-off Assessments
  // (type SPECIAL, e.g. a roof replacement), and ad-hoc unit Charges
  // (metered water, one-off fees - a separate model entirely).
  const allocationPercent = effectiveAllocations(orgUnits).get(unit.id) ?? 0
  const duesBudget = approvedBudget ?? proposedBudget
  const duesBudgetTotal = duesBudget?.lineItems.reduce((s, i) => s + i.budgetedAmount, 0) ?? null
  const duesBudgetCurrency = (duesBudget?.currency ?? org?.baseCurrency ?? "USD") as Currency
  const duesBudgetRate = duesBudget?.exchangeRate ?? org?.currentExchangeRate ?? null
  const duesBudgetIsApproved = !!approvedBudget
  const estimatedAnnualDues = duesBudgetTotal != null ? duesBudgetTotal * (allocationPercent / 100) : null
  const orgRate = org?.currentExchangeRate ?? duesBudgetRate

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

  // --- occupancy (only where the owner has shared it) ----------------------
  // If the owner hasn't opted in, there is deliberately no way to tell
  // "kept private" from "nothing logged" - both show as no current
  // occupancy. PM and Board each check their own visibility flag.
  const occupancyShared = isPmViewer
    ? (primaryOwnership?.occupancyVisibleToPM ?? false)
    : (primaryOwnership?.occupancyVisibleToBoard ?? false)
  const now = new Date()
  const currentEntry = occupancyShared
    ? unit.occupancyEntries.find((e) => e.startDate <= now && e.endDate >= now) ?? null
    : null
  const nextEntry = occupancyShared
    ? unit.occupancyEntries
        .filter((e) => e.startDate > now)
        .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0] ?? null
    : null
  const leaseVisible = occupancyShared ? activeLease : null

  // --- tickets -----------------------------------------------------------
  const openTickets = unit.tickets.filter((t) => t.status !== "CLOSED")
  const recentClosedTickets = unit.tickets
    .filter((t) => t.status === "CLOSED")
    .slice(0, 3)

  const { propertyLines } = unitAddressLines(
    org ?? {
      addressLine1: null,
      addressLine2: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    },
    unitName
  )

  return (
    <div className="max-w-2xl space-y-4">
      <div>
        <Link
          href={`${basePath}/units`}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Units
        </Link>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold">{unitName}</h1>
          <span
            className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[unit.status] ?? "bg-gray-100 text-gray-500"}`}
          >
            {unit.status.replace(/_/g, " ")}
          </span>
        </div>
        {earliestSince && (
          <p className="text-gray-500 text-sm mt-1">
            Current ownership since {formatDate(earliestSince)}
          </p>
        )}
      </div>

      {pending && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm">
          <p className="font-medium text-amber-800">
            Ownership transfer to {pending.newOwnerName} pending confirmation
          </p>
          <p className="text-amber-700 text-xs mt-1">
            Sellers:{" "}
            {pending.sellerConfirmations
              .map((c) => `${c.owner.name ?? c.owner.email}${c.confirmedAt ? " ✓" : " (waiting)"}`)
              .join(", ") || "none required"}
            {" · "}
            Buyer: {pending.invite?.acceptedAt ? "✓ confirmed" : "waiting"}
          </p>
          <Link
            href={`${basePath}/units`}
            className="text-amber-800 underline text-xs mt-1 inline-block"
          >
            Manage transfers on the Units list
          </Link>
        </div>
      )}

      {/* Top summary: address, owners (side by side), unit manager, dues at a glance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-gray-500" /> Unit Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="space-y-1.5">
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-gray-600">
              {unit.bedrooms != null && <span>{unit.bedrooms} bed</span>}
              {unit.bathrooms != null && <span>{unit.bathrooms} bath</span>}
              {unit.sqft != null && <span>{unit.sqft.toLocaleString()} sqft</span>}
              {unit.floor != null && <span>Floor {unit.floor}</span>}
              {unit.building && <span>Building {unit.building}</span>}
            </div>
            {unit.description && <p className="text-gray-600">{unit.description}</p>}
            <div>
              <p className="font-medium text-gray-700">{unitName}</p>
              {propertyLines.length > 0 ? (
                propertyLines.map((line, i) => (
                  <p key={i} className="text-gray-500">
                    {line}
                  </p>
                ))
              ) : (
                <p className="text-gray-400">Property address not on file.</p>
              )}
            </div>
            {unit.civicRoll && (
              <p className="text-xs text-gray-400">Civic roll number: {unit.civicRoll}</p>
            )}
            {(unit.accessCode || unit.accessCodeNotes) && (
              <div className="flex items-start gap-2 rounded-lg bg-gray-50 border px-3 py-2">
                <KeyRound className="h-4 w-4 text-gray-400 mt-0.5 shrink-0" />
                <div>
                  {unit.accessCode && (
                    <p className="font-mono text-gray-700">{unit.accessCode}</p>
                  )}
                  {unit.accessCodeNotes && (
                    <p className="text-xs text-gray-500">{unit.accessCodeNotes}</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Owners - side by side to save space */}
          <div className="border-t pt-3">
            <UnitOwnersEditor
              unitId={unit.id}
              owners={unit.ownerships.map((o) => ({
                ownershipId: o.id,
                name: o.owner.name,
                email: o.owner.email,
                phone: o.owner.phone,
                sinceLabel: formatDate(o.since),
                rentalPolicyLabel: o.rentalPolicy
                  ? rentalPolicyLabel[o.rentalPolicy] ?? o.rentalPolicy
                  : null,
              }))}
              heading="Ownership"
              layout="grid"
            />
          </div>

          {/* Unit Manager - compact, one line per manager */}
          <div className="border-t pt-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1.5">
              <UserCog className="h-3.5 w-3.5" /> Unit Manager
            </p>
            {unit.managers.length === 0 ? (
              <p className="text-gray-400">
                {unit.selfManaged ? "Self-managed by the owner." : "No unit manager assigned."}
              </p>
            ) : (
              <div className="space-y-1">
                {unit.managers.map((m) => {
                  const name = m.user?.name ?? m.name
                  const email = m.user?.email ?? m.email
                  const phone = m.user?.phone ?? m.phone
                  return (
                    <div key={m.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                      <span className="font-medium">{name ?? email ?? "Unit manager"}</span>
                      {phone && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Phone className="h-3.5 w-3.5" /> {phone}
                        </span>
                      )}
                      {email && (
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <Mail className="h-3.5 w-3.5" /> {email}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Dues at a glance - full breakdown is its own block below */}
          <div className="border-t pt-3 flex items-baseline justify-between">
            <span className="text-gray-500 flex items-center gap-1.5">
              <Receipt className="h-3.5 w-3.5 text-gray-400" /> Dues ({duesBudget?.year ?? "—"})
            </span>
            <span className="text-right">
              <span className="font-semibold tabular-nums">{fmtPeso(annualDuesPeso)}</span>
              <span className="text-xs text-gray-400 tabular-nums"> / {fmtUsd(annualDuesUsd)}</span>
              <span
                className={`ml-2 text-xs font-medium ${duesOutstanding > 0.005 ? "text-red-600" : "text-green-700"}`}
              >
                {duesOutstanding > 0.005 ? "owing" : "paid up"}
              </span>
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Maintenance */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Wrench className="h-4 w-4 text-gray-500" /> Maintenance
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {openTickets.length === 0 && recentClosedTickets.length === 0 && (
            <p className="text-gray-400">No trouble tickets for this unit.</p>
          )}
          {openTickets.map((t) => (
            <div key={t.id} className="flex items-start justify-between gap-3 border-b last:border-b-0 pb-2 last:pb-0">
              <div className="min-w-0">
                <p className="font-medium truncate">{t.title}</p>
                <p className="text-xs text-gray-400">
                  {t.priority} priority · opened {formatDate(t.createdAt)}
                </p>
              </div>
              <span
                className={`shrink-0 text-xs font-medium px-2 py-1 rounded-full ${ticketStatusColors[t.status] ?? "bg-gray-100 text-gray-500"}`}
              >
                {t.status.replace(/_/g, " ")}
              </span>
            </div>
          ))}
          {recentClosedTickets.length > 0 && (
            <div className="pt-1">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-400 mb-1">
                Recently closed
              </p>
              {recentClosedTickets.map((t) => (
                <p key={t.id} className="text-xs text-gray-500">
                  {t.title} &mdash; {t.status.toLowerCase()}{" "}
                  {t.resolvedAt ? formatDate(t.resolvedAt) : formatDate(t.updatedAt)}
                </p>
              ))}
            </div>
          )}
          <Link
            href={`${basePath}/tickets`}
            className="text-xs text-blue-600 hover:underline inline-block"
          >
            View all tickets
          </Link>
        </CardContent>
      </Card>

      {/* Occupancy */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-gray-500" /> Occupancy
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-2">
          {!occupancyShared && (
            <p className="text-gray-400">
              No current occupancy on record. Owners choose whether to share their occupancy
              calendar with the {isPmViewer ? "Property Manager" : "Board"}.
            </p>
          )}
          {occupancyShared && (
            <>
              {currentEntry ? (
                <div>
                  <span
                    className={`text-xs font-medium px-2 py-1 rounded-full ${occupancyTypeColor[currentEntry.type] ?? "bg-gray-100 text-gray-600"}`}
                  >
                    {occupancyTypeLabel[currentEntry.type] ?? currentEntry.type}
                  </span>
                  <p className="text-gray-600 mt-1.5">
                    {currentEntry.occupantName ? `${currentEntry.occupantName} · ` : ""}
                    {formatDate(currentEntry.startDate)} &ndash; {formatDate(currentEntry.endDate)}
                  </p>
                </div>
              ) : leaseVisible ? (
                <p className="text-gray-600">
                  Leased to {leaseVisible.renter.name ?? leaseVisible.renter.email} since{" "}
                  {formatDate(leaseVisible.startDate)}
                  {leaseVisible.endDate ? `, through ${formatDate(leaseVisible.endDate)}` : ""}
                  {" "}
                  <span className="text-gray-400">(no calendar entry for today)</span>
                </p>
              ) : (
                <p className="text-gray-400">Nothing logged for today.</p>
              )}
              {nextEntry && (
                <p className="text-xs text-gray-400">
                  Next: {occupancyTypeLabel[nextEntry.type] ?? nextEntry.type} from{" "}
                  {formatDate(nextEntry.startDate)}
                </p>
              )}
              <Link
                href={`${basePath}/occupancy`}
                className="text-xs text-blue-600 hover:underline inline-block"
              >
                View all occupancy
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Dues, Assessments & Charges - the full breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" /> Dues, Assessments &amp; Charges
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-sm">
          {/* Dues */}
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Dues</p>
            <div className="flex items-baseline justify-between">
              <span className="text-gray-500">Allocation share</span>
              <span className="font-semibold tabular-nums">{allocationPercent.toFixed(2)}%</span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-gray-500">Payment schedule</span>
              <span className="tabular-nums">
                {DUES_FREQUENCY_LABEL[unit.duesFrequency]} ({paymentsPerYear}&times;/yr)
              </span>
            </div>

            <div
              className={`grid gap-x-3 gap-y-1.5 border-t pt-3 ${forwardPeso != null ? "grid-cols-[minmax(72px,1fr)_auto_auto]" : "grid-cols-[minmax(72px,1fr)_auto]"}`}
            >
              <div />
              <p className="text-right text-xs font-medium text-gray-400 tabular-nums">{duesBudget?.year ?? "—"}</p>
              {forwardPeso != null && (
                <p className="text-right text-xs font-medium text-gray-400 tabular-nums">{forwardBudget?.year}</p>
              )}

              <span className="font-medium text-gray-700">Annual dues</span>
              <span className="text-right tabular-nums">
                <span className="font-semibold">{fmtPeso(annualDuesPeso)}</span>
                <span className="block text-xs text-gray-400">{fmtUsd(annualDuesUsd)}</span>
              </span>
              {forwardPeso != null && (
                <span className="text-right tabular-nums">
                  <span className="font-semibold">{fmtPeso(forwardPeso)}</span>
                  <span className="block text-xs text-gray-400">{fmtUsd(forwardUsd)}</span>
                </span>
              )}

              {perPaymentPeso != null &&
                paymentLabels.map((label, i) => (
                  <Fragment key={label}>
                    <span className="text-gray-500 border-t pt-1.5">{label}</span>
                    <span className="text-right tabular-nums border-t pt-1.5">
                      <span>{fmtPeso(perPaymentPeso)}</span>
                      <span className="block text-xs text-gray-400">{fmtUsd(perPaymentUsd)}</span>
                    </span>
                    {forwardPerPaymentPeso != null && (
                      <span className="text-right tabular-nums border-t pt-1.5">
                        <span>{fmtPeso(forwardPerPaymentPeso)}</span>
                        <span className="block text-xs text-gray-400">{fmtUsd(forwardPerPaymentUsd)}</span>
                      </span>
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
                      {isDraft ? "Proposed — not yet issued" : `Due ${formatDate(c.assessment.dueDate)}`}
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
                      {c.dueDate ? `Due ${formatDate(c.dueDate)}` : `Charged ${formatDate(c.chargedOn)}`}
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
            <span
              className={`font-semibold tabular-nums ${totalOutstanding > 0.005 ? "text-red-600" : "text-green-700"}`}
            >
              {totalOutstanding > 0.005 ? formatMoney(totalOutstanding, "MXN") : "Paid up"}
            </span>
          </div>
          <Link
            href={`${basePath}/finances/dues`}
            className="text-xs text-blue-600 hover:underline inline-block"
          >
            View the full dues roster
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
