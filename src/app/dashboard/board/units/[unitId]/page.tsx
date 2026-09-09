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
import { canPreviewRole } from "@/lib/role-access"
import { getUnitLabel, unitDisplayName, unitAddressLines } from "@/lib/unit-label"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { convertToSecondary, formatMoney } from "@/lib/currency"
import { perPaymentDues, DUES_FREQUENCY_PER_YEAR, DUES_FREQUENCY_LABEL } from "@/lib/dues"
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
  OPEN: "bg-red-100 text-red-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-500",
}

const rentalPolicyLabel: Record<string, string> = {
  ANYONE: "Rents to anyone",
  FRIENDS_FAMILY_ONLY: "Friends & family only",
  SHORT_TERM_RENTAL: "Short-term rental",
  NOT_RENTING: "Not renting",
}

// A read-only, whole-picture view of a single unit for Board Members -
// ownership, physical facts, dues standing, occupancy (only where the owner
// has shared it), the unit manager, and open maintenance. Every action
// (transfers, editing, occupancy logging) stays on the pages that own it;
// this page never mutates anything.
export default async function BoardUnitDetailPage({
  params,
}: {
  params: Promise<{ unitId: string }>
}) {
  const { unitId } = await params
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")
  if (!canPreviewRole(session.user.role, "BOARD_MEMBER") && !session.user.isBoardMember) {
    redirect("/dashboard")
  }

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
        assessmentCharges: {
          where: { assessment: { status: "ISSUED" } },
          include: { assessment: true },
        },
        unitCharges: true,
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
  const owners = unit.ownerships.map((o) => o.owner)
  const primaryOwnership = unit.ownerships[0] ?? null
  const earliestSince = unit.ownerships.reduce<Date | null>(
    (min, o) => (min === null || o.since < min ? o.since : min),
    null
  )
  const activeLease = unit.leases[0] ?? null
  const pending = unit.ownershipTransferRequests[0] ?? null

  // --- dues standing -------------------------------------------------------
  const allocationPercent = effectiveAllocations(orgUnits).get(unit.id) ?? 0
  const duesBudget = approvedBudget ?? proposedBudget
  const duesBudgetTotal = duesBudget?.lineItems.reduce((s, i) => s + i.budgetedAmount, 0) ?? null
  const duesBudgetCurrency = (duesBudget?.currency ?? org?.baseCurrency ?? "USD") as Currency
  const duesBudgetRate = duesBudget?.exchangeRate ?? org?.currentExchangeRate ?? null
  const duesBudgetIsApproved = !!approvedBudget
  const annualDues = duesBudgetTotal != null ? duesBudgetTotal * (allocationPercent / 100) : null
  const perPayment = annualDues != null ? perPaymentDues(annualDues, unit.duesFrequency) : null
  const paymentsPerYear = DUES_FREQUENCY_PER_YEAR[unit.duesFrequency]

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

  // What this unit currently owes: unpaid balance across issued assessment
  // charges plus any ad-hoc unit charges (metered water, one-off fees).
  const assessmentOutstanding = unit.assessmentCharges.reduce(
    (s, c) => s + Math.max(c.amountDue - c.amountPaid, 0),
    0
  )
  const unitChargeOutstanding = unit.unitCharges.reduce(
    (s, c) => s + Math.max(c.amount - c.amountPaid, 0),
    0
  )
  const totalOutstanding = assessmentOutstanding + unitChargeOutstanding
  const nextDue = unit.assessmentCharges
    .filter((c) => c.amountDue - c.amountPaid > 0.005)
    .sort((a, b) => a.assessment.dueDate.getTime() - b.assessment.dueDate.getTime())[0]

  // --- occupancy (only where the owner has shared it with the Board) ------
  // Mirrors the Board Occupancy page exactly: if the owner hasn't opted in,
  // there is deliberately no way to tell "kept private" from "nothing
  // logged" - both show as no current occupancy.
  const occupancyShared = primaryOwnership?.occupancyVisibleToBoard ?? false
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
  const openTickets = unit.tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
  const recentClosedTickets = unit.tickets
    .filter((t) => t.status === "RESOLVED" || t.status === "CLOSED")
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
          href="/dashboard/board/units"
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
            href="/dashboard/board/units"
            className="text-amber-800 underline text-xs mt-1 inline-block"
          >
            Manage transfers on the Units list
          </Link>
        </div>
      )}

      {/* Ownership */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-gray-500" /> Ownership
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {owners.length === 0 && <p className="text-gray-400">No current owner on record.</p>}
          {unit.ownerships.map((o) => (
            <div key={o.id} className="border-b last:border-b-0 pb-3 last:pb-0">
              <p className="font-semibold">{o.owner.name ?? o.owner.email ?? "Unnamed owner"}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600 mt-0.5">
                {o.owner.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {o.owner.email}
                  </span>
                )}
                {o.owner.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" /> {o.owner.phone}
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Since {formatDate(o.since)}
                {o.rentalPolicy && ` · ${rentalPolicyLabel[o.rentalPolicy] ?? o.rentalPolicy}`}
              </p>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Unit facts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Unit Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
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
            <div className="flex items-start gap-2 rounded-lg bg-gray-50 border px-3 py-2 mt-1">
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
        </CardContent>
      </Card>

      {/* Dues standing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4 text-gray-500" /> Dues &amp; Financial Standing
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
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

          <div className="grid grid-cols-[1fr_auto_auto] gap-x-4 gap-y-1.5 border-t pt-3">
            <div />
            <p className="text-right text-xs font-medium uppercase tracking-wide text-gray-400">
              MXN
            </p>
            <p className="text-right text-xs font-medium uppercase tracking-wide text-gray-400">
              US$
            </p>

            <span className="text-gray-500">
              Annual dues
              {duesBudget ? (duesBudgetIsApproved ? "" : " (proposed budget)") : " (no budget set)"}
            </span>
            <span className="text-right tabular-nums">
              {annualDues != null ? fmtPeso(pesoAmount(annualDues)) : "—"}
            </span>
            <span className="text-right tabular-nums">
              {annualDues != null ? fmtUsd(usdAmount(annualDues)) : "—"}
            </span>

            {perPayment != null && (
              <>
                <span className="text-gray-500">Each payment</span>
                <span className="text-right tabular-nums">{fmtPeso(pesoAmount(perPayment))}</span>
                <span className="text-right tabular-nums">{fmtUsd(usdAmount(perPayment))}</span>
              </>
            )}
          </div>

          <div className="border-t pt-3 flex items-baseline justify-between">
            <span className="text-gray-500">Currently outstanding</span>
            <span
              className={`font-semibold tabular-nums ${totalOutstanding > 0.005 ? "text-red-600" : "text-green-700"}`}
            >
              {totalOutstanding > 0.005
                ? formatMoney(totalOutstanding, duesBudgetCurrency)
                : "Paid up"}
            </span>
          </div>
          {totalOutstanding > 0.005 && (
            <p className="text-xs text-gray-400">
              {formatMoney(assessmentOutstanding, duesBudgetCurrency)} in dues &amp; assessments
              {unitChargeOutstanding > 0.005 &&
                ` · ${formatMoney(unitChargeOutstanding, duesBudgetCurrency)} in other charges`}
              {nextDue && ` · next due ${formatDate(nextDue.assessment.dueDate)}`}
            </p>
          )}
          <Link
            href="/dashboard/board/finances/dues"
            className="text-xs text-blue-600 hover:underline inline-block"
          >
            View the full dues roster
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
              calendar with the Board.
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
                href="/dashboard/board/occupancy"
                className="text-xs text-blue-600 hover:underline inline-block"
              >
                View all occupancy
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Unit Manager */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <UserCog className="h-4 w-4 text-gray-500" /> Unit Manager
          </CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          {unit.managers.length === 0 && (
            <p className="text-gray-400">
              {unit.selfManaged ? "Self-managed by the owner." : "No unit manager assigned."}
            </p>
          )}
          {unit.managers.map((m) => {
            const name = m.user?.name ?? m.name
            const email = m.user?.email ?? m.email
            const phone = m.user?.phone ?? m.phone
            return (
              <div key={m.id}>
                <p className="font-semibold">{name ?? email ?? "Unit manager"}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-gray-600 mt-0.5">
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
                {m.grants.length > 0 && (
                  <p className="text-xs text-gray-400 mt-1">
                    Access: {m.grants.map((g) => `${g.area.toLowerCase()} (${g.level.toLowerCase()})`).join(", ")}
                  </p>
                )}
              </div>
            )
          })}
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
            href="/dashboard/board/tickets"
            className="text-xs text-blue-600 hover:underline inline-block"
          >
            View all tickets
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
