import type { ReactNode } from "react"
import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  TicketIcon,
  DollarSign,
  CalendarDays,
  UserCog,
  FileWarning,
  Megaphone,
  ChevronRight,
} from "lucide-react"
import Link from "next/link"
import { occupancyTypeLabel } from "@/lib/occupancy-styles"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { getUpcomingKeyDates } from "@/lib/key-dates"
import { isVisibleToRoles, notExpiredAnnouncement, isLiveAnnouncement } from "@/lib/audience"
import { ConfirmTransferButton } from "@/components/units/confirm-transfer-button"
import { getOwnerFinancialOverview } from "@/lib/owner-financial-overview"
import { OwnerFinancialDetail } from "@/components/owner/owner-financial-detail"
import type { Role } from "@/generated/prisma"

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OWNER_OCCUPIED: "Owner Occupied",
    RENTED: "Rented",
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
  }
  return labels[status] ?? status
}

// A unit's occupancy state as of right now, not the full calendar - the
// calendar itself still lives at the unit's own page (#occupancy-calendar).
function currentOccupancy(
  unit: {
    status: string
    leases: { renter: { name: string | null } }[]
    occupancyEntries: { startDate: Date; endDate: Date; type: string; occupantName: string | null }[]
  },
  now: Date
) {
  const activeLease = unit.leases[0]
  if (activeLease) return { label: "Rented", detail: activeLease.renter.name }
  const todaysEntry = unit.occupancyEntries.find((e) => e.startDate <= now && e.endDate >= now)
  if (todaysEntry) return { label: occupancyTypeLabel[todaysEntry.type] ?? todaysEntry.type, detail: todaysEntry.occupantName }
  return { label: statusLabel(unit.status), detail: null as string | null }
}

// Redesigned 2026-08-28 per Dara's home-page spec, then tightened twice
// further the same day after his first look:
// - dropped the separate "getting started" card (redundant next to the
//   priorities list below - per-page onboarding tracking is untouched)
// - Board/PM/Unit Manager/Security/Report an Issue moved to a single-row
//   quick-link bar ABOVE the role block (Security has no real destination
//   yet - no such contact/data concept exists anywhere - routed to
//   Governance for now, flagged to Dara rather than invented)
// - Dues/Key Dates/Occupancy are no longer separate cards OR a single
//   combined tile - each OWNED UNIT gets its own tile (occupancy + that
//   unit's own dues, not a combined total), since an owner with 2+ units
//   needs to know which one owes what; Key Dates stays one org-wide tile
//   alongside them. The old separate "Your Units" list below was dropped
//   entirely once these tiles gave the same click-through navigation.
export default async function OwnerDashboard() {
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")

  const now = new Date()
  const isBoardMember = session.user.isBoardMember
  const viewerRoles: Role[] = isBoardMember ? ["OWNER", "BOARD_MEMBER"] : ["OWNER"]

  const [ownerships, latestMeeting, unitLabel, announcementRows, orgMemberships, pendingSellerConfirmations, financialOverview] = await Promise.all([
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true },
      include: {
        unit: {
          include: {
            leases: { where: { isActive: true }, include: { renter: true } },
            tickets: { where: { status: { in: ["ACTIVE", "DEFERRED"] } }, orderBy: { createdAt: "desc" } },
            occupancyEntries: { orderBy: { startDate: "asc" } },
            managers: true,
            contracts: true,
          },
        },
      },
    }),
    session.user.orgId
      ? db.meeting.findFirst({ where: { orgId: session.user.orgId }, orderBy: { date: "desc" } })
      : Promise.resolve(null),
    getUnitLabel(session.user.orgId),
    db.announcement.findMany({
      where: {
        orgId: session.user.orgId ?? undefined,
        archivedAt: null,
        AND: [notExpiredAnnouncement(), isLiveAnnouncement()],
      },
      include: { author: true, comments: { include: { author: true }, orderBy: { createdAt: "asc" } } },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    db.membership.findMany({ where: { orgId: session.user.orgId ?? undefined }, select: { userId: true, role: true } }),
    // Any transfer this owner still needs to confirm they're divesting -
    // surfaced prominently since it's exactly the kind of "priority with
    // ability to trigger an action" this page exists for, per Dara.
    db.ownershipTransferSellerConfirmation.findMany({
      where: { ownerId: session.user.id, confirmedAt: null, request: { status: "PENDING" } },
      include: { request: { include: { unit: true } } },
    }),
    getOwnerFinancialOverview(session),
  ])

  const unitIds = ownerships.map((o) => o.unitId)
  const charges = unitIds.length
    ? await db.assessmentCharge.findMany({
        where: { unitId: { in: unitIds }, assessment: { status: "ISSUED" } },
        include: { assessment: true },
      })
    : []
  // Per-unit, not an org-wide aggregate - each owned unit gets its own
  // dues tile below (an owner with 2 units needs to know which one owes
  // what, not just a combined total).
  const chargesByUnit = new Map<string, typeof charges>()
  for (const c of charges) {
    const list = chargesByUnit.get(c.unitId)
    if (list) list.push(c)
    else chargesByUnit.set(c.unitId, [c])
  }
  function unitDues(unitId: string) {
    const unitCharges = chargesByUnit.get(unitId) ?? []
    const outstanding = unitCharges.reduce((s, c) => s + Math.max(c.amountDue - c.amountPaid, 0), 0)
    const nextDue = unitCharges
      .filter((c) => c.amountPaid < c.amountDue)
      .sort((a, b) => a.assessment.dueDate.getTime() - b.assessment.dueDate.getTime())[0]
    // "Annual total" and a plain-English cadence, derived from how many
    // REGULAR_DUES charges actually landed this calendar year - not a
    // stored setting (no such field exists), so this describes what
    // actually happened rather than asserting a billing policy.
    const regularThisYear = unitCharges.filter(
      (c) => c.assessment.type === "REGULAR_DUES" && c.assessment.dueDate.getFullYear() === now.getFullYear()
    )
    const annualTotal = regularThisYear.reduce((s, c) => s + c.amountDue, 0)
    const cadenceLabel =
      regularThisYear.length >= 12
        ? "Monthly"
        : regularThisYear.length === 4
          ? "Quarterly"
          : regularThisYear.length === 2
            ? "Semi-annual"
            : regularThisYear.length === 1
              ? "Annual"
              : regularThisYear.length > 0
                ? `${regularThisYear.length}x/yr`
                : ""
    return { outstanding, nextDue, annualTotal, cadenceLabel }
  }

  const yearStart = new Date(now.getFullYear(), 0, 1)
  const expenseRows = unitIds.length
    ? await db.ownerExpense.findMany({
        where: { ownerId: session.user.id, unitId: { in: unitIds }, date: { gte: yearStart } },
        select: { unitId: true, amount: true },
      })
    : []
  const expenseByUnit = new Map<string, number>()
  for (const e of expenseRows) {
    expenseByUnit.set(e.unitId, (expenseByUnit.get(e.unitId) ?? 0) + e.amount)
  }
  const yearExpenseTotal = expenseRows.reduce((s, e) => s + e.amount, 0)
  const billingPeriodLabel: Record<string, string> = { WEEKLY: "wk", MONTHLY: "mo", YEARLY: "yr" }

  const roleByUserId = new Map(orgMemberships.map((m) => [m.userId, m.role]))
  const announcements = announcementRows
    .filter((a) => isVisibleToRoles(a.visibleRoles, viewerRoles))
    .slice(0, 3)
    .map((a) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      createdAt: a.createdAt,
      author: { name: a.author.name, email: a.author.email, role: roleByUserId.get(a.authorId) ?? "OWNER" },
      comments: a.comments.map((c) => ({
        id: c.id,
        content: c.content,
        createdAt: c.createdAt,
        authorId: c.authorId,
        author: { name: c.author.name, email: c.author.email, role: roleByUserId.get(c.authorId) ?? "OWNER" },
      })),
    }))

  const keyDates = await getUpcomingKeyDates(
    session.user.orgId ?? "",
    { agm: "/dashboard/owner/governance/agm", dues: "/dashboard/owner/financial/dues" },
    viewerRoles
  )

  const openTickets = ownerships.flatMap((o) => o.unit.tickets)
  const monthlyIncome = ownerships
    .flatMap((o) => o.unit.leases)
    .filter((l) => l.isActive && l.monthlyRent)
    .reduce((s, l) => s + (l.monthlyRent ?? 0), 0)

  // "As an Owner..." priorities - state-based (what's true right now), not
  // behavior-learned; trimmed to what needs attention. Occupancy/dues
  // aren't repeated here - each has its own tile below.
  const unmanagedUnits = ownerships.filter((o) => !o.unit.selfManaged && o.unit.managers.length === 0)
  const expiringContracts = ownerships
    .flatMap((o) => o.unit.contracts)
    .filter((c) => {
      if (!c.endDate) return false
      const daysUntil = (c.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      return daysUntil >= 0 && daysUntil <= c.reminderDaysBefore
    })
  const meetingIsNew = latestMeeting
    ? (now.getTime() - latestMeeting.createdAt.getTime()) / (1000 * 60 * 60 * 24) <= 14
    : false

  const priorities: { icon: ReactNode; text: string; href?: string }[] = []
  if (openTickets.length > 0) {
    const highlighted = openTickets.find((t) => t.priority === "URGENT" || t.priority === "EMERGENCY") ?? openTickets[0]
    priorities.push({
      icon: <TicketIcon className="h-4 w-4 text-orange-500" />,
      text: `${openTickets.length} open ticket${openTickets.length !== 1 ? "s" : ""} — ${highlighted.title}.`,
      href: "/dashboard/owner/tickets",
    })
  }
  if (unmanagedUnits.length > 0) {
    priorities.push({
      icon: <UserCog className="h-4 w-4 text-teal-600" />,
      text: `${unitDisplayName(unitLabel, unmanagedUnits[0].unit.number)} has no Unit Manager assigned yet.`,
      href: `/dashboard/owner/units/${unmanagedUnits[0].unit.id}`,
    })
  }
  if (expiringContracts.length > 0) {
    priorities.push({
      icon: <FileWarning className="h-4 w-4 text-amber-600" />,
      text: `${expiringContracts[0].title} renews ${expiringContracts[0].endDate!.toLocaleDateString()}.`,
    })
  }
  if (latestMeeting && meetingIsNew) {
    priorities.push({
      icon: <Megaphone className="h-4 w-4 text-purple-600" />,
      text: `Board meeting "${latestMeeting.title}" on ${latestMeeting.date.toLocaleDateString()}${latestMeeting.minutes ? " — minutes posted." : "."}`,
      href: "/dashboard/owner/governance",
    })
  }

  // Per Dara 2026-08-28: name the actual unit(s) right in the block title
  // instead of a generic "As an Owner..." - singular for one unit, "units,"
  // plus the full list for more than one.
  const ownedUnitNames = ownerships.map((o) => unitDisplayName(unitLabel, o.unit.number, o.unit.building))
  const ownerBlockTitle =
    ownedUnitNames.length === 0
      ? "As an Owner..."
      : ownedUnitNames.length === 1
        ? `As the owner of ${ownedUnitNames[0]}...`
        : `As the owner of units, ${ownedUnitNames.join(", ")}...`

  return (
    <div className="space-y-6">
      {/* Pending ownership-transfer confirmations awaiting this owner's
          sign-off - the Board-proposed transfer doesn't take effect until
          every current owner confirms and the buyer accepts their invite. */}
      {pendingSellerConfirmations.map((c) => (
        <div
          key={c.id}
          className="flex items-center justify-between gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3"
        >
          <p className="text-sm text-amber-800">
            <span className="font-medium">
              {unitDisplayName(unitLabel, c.request.unit.number, c.request.unit.building)}
            </span>{" "}
            is being transferred to {c.request.newOwnerName}, effective {c.request.since.toLocaleDateString()}.
            Confirm you&apos;re divesting to proceed.
          </p>
          <ConfirmTransferButton requestId={c.request.id} />
        </div>
      ))}

      {/* "As the owner of ..." */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{ownerBlockTitle}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          {priorities.length > 0 ? (
            <ul className="space-y-2">
              {priorities.slice(0, 5).map((s, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="mt-0.5 shrink-0">{s.icon}</span>
                  {s.href ? (
                    <Link href={s.href} className="hover:underline">
                      {s.text}
                    </Link>
                  ) : (
                    <span>{s.text}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500">
              Everything&apos;s quiet — no open tickets, no unmanaged units, nothing expiring soon.
            </p>
          )}

          {/* Per-unit detail cards - click straight through to a unit.
              Real numbers throughout: annual dues total + a cadence label
              derived from how many charges actually landed this year (not
              a stored billing-frequency setting - none exists), the next
              payment, that unit's own rental income and logged expenses,
              and its contracts' recurring rate. Not a combined total
              across units - an owner with 2+ units needs to know which
              one owes/earns/spends what. */}
          <div className="space-y-2 border-t pt-3">
            {ownerships.map(({ unit }) => {
              const occ = currentOccupancy(unit, now)
              const dues = unitDues(unit.id)
              const lease = unit.leases[0]
              const unitExpense = expenseByUnit.get(unit.id) ?? 0
              return (
                <Link
                  key={unit.id}
                  href={`/dashboard/owner/units/${unit.id}`}
                  className="block bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2.5 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold">{unitDisplayName(unitLabel, unit.number, unit.building)}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-gray-300 shrink-0" />
                  </div>
                  <p className="text-[11px] text-gray-400 mb-1.5">
                    {occ.label}
                    {occ.detail ? ` · ${occ.detail}` : ""}
                  </p>

                  {/* Dues/income/expenses condensed onto one line per Dara
                      ("if you think it fits nicely") - was a 2-column,
                      6-line grid; the same numbers read fine run together. */}
                  <p className="text-[11px] text-gray-500 truncate">
                    <span className="font-medium text-gray-700">
                      {dues.annualTotal > 0 ? `$${dues.annualTotal.toLocaleString()}/yr dues` : "No dues billed"}
                    </span>
                    {dues.cadenceLabel && ` (${dues.cadenceLabel})`}
                    {dues.nextDue && (
                      <span className={dues.outstanding > 0 ? "text-amber-600 font-medium" : ""}>
                        {" "}
                        · ${(dues.nextDue.amountDue - dues.nextDue.amountPaid).toLocaleString()} due{" "}
                        {dues.nextDue.assessment.dueDate.toLocaleDateString()}
                      </span>
                    )}
                    {" · "}
                    {lease?.monthlyRent ? `$${lease.monthlyRent.toLocaleString()}/mo rent` : "Not rented"}
                    {" · "}
                    {unitExpense > 0 ? `$${unitExpense.toLocaleString()} expenses` : "No expenses"}
                  </p>

                  {unit.contracts.length > 0 && (
                    <p className="text-[11px] text-gray-500 mt-1.5 pt-1.5 border-t truncate">
                      {unit.contracts
                        .map(
                          (c) =>
                            `${c.title}${c.amount ? `: $${c.amount.toLocaleString()}${c.billingPeriod ? `/${billingPeriodLabel[c.billingPeriod]}` : ""}` : ""}`
                        )
                        .join(" · ")}
                    </p>
                  )}
                </Link>
              )
            })}

            <Link href={keyDates[0]?.href ?? "/dashboard/owner/governance"} className="block bg-gray-50 hover:bg-gray-100 rounded-lg px-3 py-2 transition-colors">
              <div className="flex items-center gap-1.5 text-gray-400">
                <CalendarDays className="h-3.5 w-3.5" />
                <span className="text-[11px]">Next Key Date</span>
              </div>
              {keyDates[0] ? (
                <p className="text-sm font-bold mt-0.5">
                  {keyDates[0].label} <span className="text-[11px] font-normal text-gray-400">{keyDates[0].date.toLocaleDateString()}</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400 mt-0.5">Nothing scheduled</p>
              )}
            </Link>
          </div>

          {ownerships.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">No units assigned yet. Contact your property manager.</p>
          )}

          <div className="border-t pt-3 flex items-center gap-6 flex-wrap">
            <Link href="/dashboard/owner/financial" className="flex items-center gap-2 hover:bg-gray-50 -mx-1 px-1 py-1 rounded-md transition-colors">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold leading-none">${monthlyIncome.toLocaleString()}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">Income, {ownerships.length} unit{ownerships.length !== 1 ? "s" : ""}</p>
              </div>
            </Link>
            <Link href="/dashboard/owner/financial/expenses" className="flex items-center gap-2 hover:bg-gray-50 -mx-1 px-1 py-1 rounded-md transition-colors">
              <div>
                <p className="text-lg font-bold leading-none">${yearExpenseTotal.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">Expenses logged this year</p>
              </div>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Full money picture - the same detail as the Dues & Assessments
          page, surfaced on landing per Dara: anticipated quarterly dues +
          due dates, assessments, charges, and the PM / Unit Manager /
          Security contacts. */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Dues, assessments &amp; contacts
          </h2>
          <Link
            href="/dashboard/owner/financial/dues"
            className="text-xs text-blue-600 hover:underline"
          >
            Open Dues &amp; Assessments
          </Link>
        </div>
        <OwnerFinancialDetail data={financialOverview} />
      </div>

      {/* Announcements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> Announcements
          </CardTitle>
          <Link href="/dashboard/owner/governance" className="text-xs text-blue-600 hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          <AnnouncementList announcements={announcements} canManage={false} currentUserId={session.user.id} />
        </CardContent>
      </Card>
    </div>
  )
}
