import type { ReactNode } from "react"
import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketIcon, DollarSign, UserCog, FileWarning, Megaphone, Phone, Mail, Receipt, ChevronRight } from "lucide-react"
import Link from "next/link"
import { occupancyTypeLabel } from "@/lib/occupancy-styles"
import { getUnitLabel, unitDisplayName, unitAddressLines } from "@/lib/unit-label"
import { formatDate } from "@/lib/utils"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { KeyDatesCard } from "@/components/key-info/key-dates-card"
import { getUpcomingKeyDates } from "@/lib/key-dates"
import { isVisibleToRoles, notExpiredAnnouncement, isLiveAnnouncement } from "@/lib/audience"
import { ConfirmTransferButton } from "@/components/units/confirm-transfer-button"
import { getOwnerFinancialOverview } from "@/lib/owner-financial-overview"
import { OwnerFinancialDetail } from "@/components/owner/owner-financial-detail"
import { UnitOwnersEditor } from "@/components/units/unit-owners-editor"
import { priorityColor, statusColor, statusLabel as ticketStatusLabel } from "@/lib/ticket-styles"
import type { Role } from "@/generated/prisma"

const rentalPolicyLabel: Record<string, string> = {
  ANYONE: "Rents to anyone",
  FRIENDS_FAMILY_ONLY: "Friends & family only",
  SHORT_TERM_RENTAL: "Short-term rental",
  NOT_RENTING: "Not renting",
}

function usd(n: number) {
  return `$${Math.round(n).toLocaleString("en-US")}`
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    OWNER_OCCUPIED: "Owner Occupied",
    RENTED: "Rented",
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
  }
  return labels[status] ?? status
}

function currentOccupancy(
  unit: {
    status: string
    leases: { renter: { name: string | null } }[]
    occupancyEntries: { startDate: Date; endDate: Date; type: string; occupantName: string | null }[]
  },
  now: Date,
) {
  const activeLease = unit.leases[0]
  if (activeLease) return { label: "Rented", detail: activeLease.renter.name }
  const todaysEntry = unit.occupancyEntries.find((e) => e.startDate <= now && e.endDate >= now)
  if (todaysEntry)
    return { label: occupancyTypeLabel[todaysEntry.type] ?? todaysEntry.type, detail: todaysEntry.occupantName }
  return { label: statusLabel(unit.status), detail: null as string | null }
}

// Owner dashboard - a rich landing view per Dara: a priorities strip, then
// a compact per-unit details card (occupancy, owned-since, RFC, civic
// roll, access code, the Unit Manager and the cleaner), the open trouble
// tickets, the full Dues / Assessments / Charges block (contacts, the
// anticipated dues schedule with due dates, assessments, and charges
// totalled by quarter), the Key Dates calendar, and announcements.
export default async function OwnerDashboard() {
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")

  const now = new Date()
  const isBoardMember = session.user.isBoardMember
  const viewerRoles: Role[] = isBoardMember ? ["OWNER", "BOARD_MEMBER"] : ["OWNER"]

  const [ownerships, latestMeeting, unitLabel, announcementRows, orgMemberships, pendingSellerConfirmations, financialOverview, org] =
    await Promise.all([
      db.unitOwnership.findMany({
        where: { ownerId: session.user.id, isCurrent: true },
        include: {
          unit: {
            include: {
              leases: { where: { isActive: true }, include: { renter: true } },
              tickets: {
                where: { status: { in: ["ACTIVE", "DEFERRED"] } },
                include: { assignments: { include: { contractor: true } } },
                orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
              },
              occupancyEntries: { orderBy: { startDate: "asc" } },
              managers: { include: { user: true } },
              contracts: true,
              ownerships: { where: { isCurrent: true }, include: { owner: true } },
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
      db.ownershipTransferSellerConfirmation.findMany({
        where: { ownerId: session.user.id, confirmedAt: null, request: { status: "PENDING" } },
        include: { request: { include: { unit: true } } },
      }),
      getOwnerFinancialOverview(session),
      db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    ])

  const yearStart = new Date(now.getFullYear(), 0, 1)
  const unitIds = ownerships.map((o) => o.unitId)
  const expenseRows = unitIds.length
    ? await db.ownerExpense.findMany({
        where: { ownerId: session.user.id, unitId: { in: unitIds }, date: { gte: yearStart } },
        select: { amount: true },
      })
    : []
  const yearExpenseTotal = expenseRows.reduce((s, e) => s + e.amount, 0)

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
    viewerRoles,
  )

  const occByUnit = new Map(ownerships.map((o) => [o.unitId, currentOccupancy(o.unit, now)]))

  const openTickets = ownerships.flatMap((o) =>
    o.unit.tickets.map((t) => ({
      ...t,
      unitName: unitDisplayName(unitLabel, o.unit.number, o.unit.building),
      assigned: t.assignments[t.assignments.length - 1],
      ageDays: Math.max(0, Math.round((now.getTime() - t.createdAt.getTime()) / 86_400_000)),
    })),
  )
  const monthlyIncome = ownerships
    .flatMap((o) => o.unit.leases)
    .filter((l) => l.isActive && l.monthlyRent)
    .reduce((s, l) => s + (l.monthlyRent ?? 0), 0)

  // Priorities - what's true right now and needs attention.
  const unmanagedUnits = ownerships.filter((o) => !o.unit.selfManaged && o.unit.managers.length === 0)
  const expiringContracts = ownerships
    .flatMap((o) => o.unit.contracts)
    .filter((c) => {
      if (!c.endDate) return false
      const daysUntil = (c.endDate.getTime() - now.getTime()) / 86_400_000
      return daysUntil >= 0 && daysUntil <= c.reminderDaysBefore
    })
  const meetingIsNew = latestMeeting
    ? (now.getTime() - latestMeeting.createdAt.getTime()) / 86_400_000 <= 14
    : false

  const priorities: { icon: ReactNode; text: string; href?: string }[] = []
  if (openTickets.length > 0) {
    const highlighted =
      openTickets.find((t) => t.priority === "URGENT" || t.priority === "EMERGENCY") ?? openTickets[0]
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

  const financeByUnit = new Map(financialOverview.units.map((u) => [u.unitId, u]))

  const ownedUnitNames = ownerships.map((o) => unitDisplayName(unitLabel, o.unit.number, o.unit.building))
  const ownerBlockTitle =
    ownedUnitNames.length === 0
      ? "As an Owner..."
      : ownedUnitNames.length === 1
        ? `As the owner of ${ownedUnitNames[0]}...`
        : `As the owner of ${ownedUnitNames.join(", ")}...`

  return (
    <div className="space-y-6">
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

      {/* Priorities */}
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
          <div className="border-t pt-3 flex items-center gap-6 flex-wrap">
            <Link
              href="/dashboard/owner/financial"
              className="flex items-center gap-2 hover:bg-gray-50 -mx-1 px-1 py-1 rounded-md transition-colors"
            >
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold leading-none">${monthlyIncome.toLocaleString()}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Income, {ownerships.length} unit{ownerships.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Link>
            <Link
              href="/dashboard/owner/financial/expenses"
              className="flex items-center gap-2 hover:bg-gray-50 -mx-1 px-1 py-1 rounded-md transition-colors"
            >
              <div>
                <p className="text-lg font-bold leading-none">${yearExpenseTotal.toLocaleString()}</p>
                <p className="text-xs text-gray-400 mt-0.5">Expenses logged this year</p>
              </div>
            </Link>
          </div>
          {ownerships.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No units assigned yet. Contact your property manager.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Unit details - tightened to match the per-unit page's top summary */}
      {ownerships.length > 0 && (
        <div className="space-y-3">
          {ownerships.map((o) => {
            const unit = o.unit
            const unitName = unitDisplayName(unitLabel, unit.number, unit.building)
            const finance = financeByUnit.get(o.unitId)
            const occ = occByUnit.get(o.unitId) ?? { label: "—", detail: null }
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
              <Card key={o.unitId}>
                <CardContent className="space-y-3 text-sm">
                  <div className="space-y-1.5">
                    <Link
                      href={`/dashboard/owner/units/${o.unitId}`}
                      className="flex items-center justify-between group"
                    >
                      <span className="font-medium text-gray-700 group-hover:underline">{unitName}</span>
                      <span className="flex items-center gap-1.5 text-xs text-gray-400">
                        {occ.label}
                        {occ.detail ? ` · ${occ.detail}` : ""}
                        <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
                      </span>
                    </Link>
                    {propertyLines.length > 0 ? (
                      propertyLines.map((line, i) => (
                        <p key={i} className="text-gray-500">
                          {line}
                        </p>
                      ))
                    ) : (
                      <p className="text-gray-400">Property address not on file.</p>
                    )}
                    {(unit.civicRoll || financialOverview.ownerRfc) && (
                      <p className="text-xs text-gray-400">
                        {unit.civicRoll && `Civic Roll Number: ${unit.civicRoll}`}
                        {unit.civicRoll && financialOverview.ownerRfc ? " · " : ""}
                        {financialOverview.ownerRfc && `RFC ${financialOverview.ownerRfc}`}
                      </p>
                    )}
                  </div>

                  {/* Owners - side by side to save space */}
                  <div className="border-t pt-3">
                    <UnitOwnersEditor
                      unitId={unit.id}
                      owners={unit.ownerships.map((ow) => ({
                        ownershipId: ow.id,
                        name: ow.owner.name,
                        email: ow.owner.email,
                        phone: ow.owner.phone,
                        sinceLabel: formatDate(ow.since),
                        rentalPolicyLabel: ow.rentalPolicy
                          ? rentalPolicyLabel[ow.rentalPolicy] ?? ow.rentalPolicy
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
                        {unit.selfManaged ? "Self-managed by you." : "No unit manager assigned."}
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

                  {/* Dues at a glance - full breakdown is in the section below */}
                  {finance && (
                    <div className="border-t pt-3 flex items-baseline justify-between">
                      <span className="text-gray-500 flex items-center gap-1.5">
                        <Receipt className="h-3.5 w-3.5 text-gray-400" /> Dues
                        {financialOverview.budget ? ` (${financialOverview.budget.year})` : ""}
                      </span>
                      <span className="text-right">
                        <span className="font-semibold tabular-nums">
                          {finance.annualDuesUsd != null ? usd(finance.annualDuesUsd) : "—"}
                        </span>
                        <span
                          className={`ml-2 text-xs font-medium ${finance.duesOutstandingUsd > 0.005 ? "text-red-600" : "text-green-700"}`}
                        >
                          {finance.duesOutstandingUsd > 0.005 ? "owing" : "paid up"}
                        </span>
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Trouble tickets */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <TicketIcon className="h-4 w-4" /> Trouble Tickets
          </CardTitle>
          <Link href="/dashboard/owner/tickets" className="text-xs text-blue-600 hover:underline">
            {openTickets.length > 0 ? "View all" : "Open tickets"}
          </Link>
        </CardHeader>
        <CardContent className="space-y-2">
          {openTickets.length === 0 ? (
            <p className="text-sm text-gray-400">No open tickets on your unit{ownerships.length !== 1 ? "s" : ""}.</p>
          ) : (
            openTickets.map((t) => (
              <div key={t.id} className="rounded-lg bg-gray-50 px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${priorityColor[t.priority]}`}
                  >
                    {t.priority}
                  </span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${statusColor[t.status]}`}
                  >
                    {ticketStatusLabel[t.status] ?? t.status}
                  </span>
                  <p className="text-sm font-semibold">{t.title}</p>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {t.unitName} · opened {t.ageDays === 0 ? "today" : `${t.ageDays}d ago`}
                  {t.assigned
                    ? ` · assigned to ${t.assigned.contractor.name ?? t.assigned.contractor.email}`
                    : " · unassigned"}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Dues, Assessments and Charges */}
      <div>
        <div className="flex items-baseline justify-between mb-2">
          <h2 className="text-base font-semibold flex items-center gap-2">
            <DollarSign className="h-4 w-4" /> Dues, Assessments and Charges
          </h2>
          <Link href="/dashboard/owner/financial/dues" className="text-xs text-blue-600 hover:underline">
            Open full page
          </Link>
        </div>
        <OwnerFinancialDetail data={financialOverview} />
      </div>

      {/* Calendar */}
      <KeyDatesCard dates={keyDates} canManage={false} />

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
