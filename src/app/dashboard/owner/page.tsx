import type { ReactNode } from "react"
import { requireOwnerAccess } from "@/lib/require-owner-access"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TicketIcon, DollarSign, UserCog, FileWarning, Megaphone } from "lucide-react"
import Link from "next/link"
import { occupancyTypeLabel } from "@/lib/occupancy-styles"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { AnnouncementList } from "@/components/announcements/announcement-list"
import { KeyDatesCard } from "@/components/key-info/key-dates-card"
import { getUpcomingKeyDates } from "@/lib/key-dates"
import { isVisibleToRoles, notExpiredAnnouncement, isLiveAnnouncement } from "@/lib/audience"
import { ConfirmTransferButton } from "@/components/units/confirm-transfer-button"
import { getOwnerFinancialOverview } from "@/lib/owner-financial-overview"
import { OwnerFinancialDetail } from "@/components/owner/owner-financial-detail"
import { UnitDetailsCard } from "@/components/owner/unit-details-card"
import { priorityColor, statusColor, statusLabel as ticketStatusLabel } from "@/lib/ticket-styles"
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

  const [ownerships, latestMeeting, unitLabel, announcementRows, orgMemberships, pendingSellerConfirmations, financialOverview] =
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
      db.ownershipTransferSellerConfirmation.findMany({
        where: { ownerId: session.user.id, confirmedAt: null, request: { status: "PENDING" } },
        include: { request: { include: { unit: true } } },
      }),
      getOwnerFinancialOverview(session),
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

      {/* Unit details */}
      {financialOverview.units.length > 0 && (
        <div>
          <h2 className="text-base font-semibold mb-2">Unit details</h2>
          <div className="space-y-3">
            {financialOverview.units.map((u) => (
              <UnitDetailsCard
                key={u.unitId}
                unitName={u.unitName}
                unitHref={`/dashboard/owner/units/${u.unitId}`}
                occupancy={occByUnit.get(u.unitId) ?? { label: "—", detail: null }}
                ownedSince={u.ownedSince}
                ownerRfc={financialOverview.ownerRfc}
                civicRoll={u.civicRoll}
                accessCode={u.accessCode}
                accessCodeNotes={u.accessCodeNotes}
                unitManager={u.unitManager}
                cleaner={u.cleaner}
              />
            ))}
          </div>
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
