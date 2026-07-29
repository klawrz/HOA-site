import type { ReactNode } from "react"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import {
  Building2,
  TicketIcon,
  DollarSign,
  CalendarDays,
  Settings,
  UserCog,
  FileWarning,
  Megaphone,
} from "lucide-react"
import Link from "next/link"
import { RentalPolicyForm } from "./rental-policy-form"
import { priorityColor as sharedPriorityColor, statusColor as sharedStatusColor } from "@/lib/ticket-styles"
import { formatDateTime, cn } from "@/lib/utils"

function greeting() {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 18) return "Good afternoon"
  return "Good evening"
}

function statusBadge(status: string) {
  const map: Record<string, string> = {
    OWNER_OCCUPIED: "bg-blue-100 text-blue-800",
    RENTED: "bg-green-100 text-green-800",
    AVAILABLE: "bg-emerald-100 text-emerald-800",
    UNAVAILABLE: "bg-gray-100 text-gray-600",
  }
  const labels: Record<string, string> = {
    OWNER_OCCUPIED: "Owner Occupied",
    RENTED: "Rented",
    AVAILABLE: "Available",
    UNAVAILABLE: "Unavailable",
  }
  return { color: map[status] ?? "bg-gray-100 text-gray-600", label: labels[status] ?? status }
}

function ticketBadge(status: string) {
  return sharedStatusColor[status] ?? "bg-gray-100 text-gray-600"
}

function priorityBadge(p: string) {
  return sharedPriorityColor[p] ?? "bg-gray-100"
}

export default async function OwnerDashboard() {
  const session = await auth()
  if (!session || session.user.role !== "OWNER") redirect("/dashboard")

  const now = new Date()

  const [ownerships, latestMeeting] = await Promise.all([
    db.unitOwnership.findMany({
      where: { ownerId: session.user.id, isCurrent: true },
      include: {
        unit: {
          include: {
            leases: { where: { isActive: true }, include: { renter: true } },
            tickets: { orderBy: { createdAt: "desc" }, take: 5, include: { submittedBy: true } },
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
  ])

  const openTickets = ownerships
    .flatMap((o) => o.unit.tickets)
    .filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS")
  const monthlyIncome = ownerships
    .flatMap((o) => o.unit.leases)
    .filter((l) => l.isActive && l.monthlyRent)
    .reduce((s, l) => s + (l.monthlyRent ?? 0), 0)

  // Today's signals - the "why am I here" summary. Each is a real query
  // result, not a placeholder - v1 is state-based (what's true right now),
  // not behavior-learned, since there isn't enough login volume on an HOA
  // app for pattern inference to beat simple recency/urgency rules.
  const unmanagedUnits = ownerships.filter((o) => !o.unit.selfManaged && o.unit.managers.length === 0)

  const upcomingStay = ownerships
    .flatMap((o) => o.unit.occupancyEntries.map((e) => ({ ...e, unit: o.unit })))
    .filter((e) => e.endDate >= now)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0]

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

  const signals: { icon: ReactNode; text: string; href?: string }[] = []
  if (upcomingStay) {
    const isCurrent = upcomingStay.startDate <= now
    signals.push({
      icon: <CalendarDays className="h-4 w-4 text-blue-500" />,
      text: isCurrent
        ? `Unit ${upcomingStay.unit.number} is currently occupied${upcomingStay.occupantName ? ` by ${upcomingStay.occupantName}` : ""}, through ${upcomingStay.endDate.toLocaleDateString()}.`
        : `Next stay at Unit ${upcomingStay.unit.number} starts ${upcomingStay.startDate.toLocaleDateString()}${upcomingStay.occupantName ? ` (${upcomingStay.occupantName})` : ""}.`,
      href: `/dashboard/owner/units/${upcomingStay.unit.id}#occupancy-calendar`,
    })
  }
  if (openTickets.length > 0) {
    const urgent = openTickets.find((t) => t.priority === "URGENT" || t.priority === "EMERGENCY")
    signals.push({
      icon: <TicketIcon className="h-4 w-4 text-orange-500" />,
      text: `${openTickets.length} open ticket${openTickets.length !== 1 ? "s" : ""}${urgent ? ` — "${urgent.title}" is ${urgent.priority.toLowerCase()} priority` : ""}.`,
    })
  }
  if (unmanagedUnits.length > 0) {
    signals.push({
      icon: <UserCog className="h-4 w-4 text-teal-600" />,
      text: `Unit ${unmanagedUnits[0].unit.number} has no Unit Manager assigned yet.`,
      href: `/dashboard/owner/units/${unmanagedUnits[0].unit.id}`,
    })
  }
  if (expiringContracts.length > 0) {
    signals.push({
      icon: <FileWarning className="h-4 w-4 text-amber-600" />,
      text: `${expiringContracts[0].title} renews ${expiringContracts[0].endDate!.toLocaleDateString()}.`,
    })
  }
  if (latestMeeting && meetingIsNew) {
    signals.push({
      icon: <Megaphone className="h-4 w-4 text-purple-600" />,
      text: `Board meeting "${latestMeeting.title}" on ${latestMeeting.date.toLocaleDateString()}${latestMeeting.minutes ? " — minutes posted." : "."}`,
    })
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Today</h1>
        <p className="text-gray-500 mt-1">
          {greeting()}, {session.user.name}.
        </p>
      </div>

      <Card>
        <CardContent className="pt-4 space-y-4">
          {signals.length > 0 ? (
            <ul className="space-y-2.5">
              {signals.map((s, i) => (
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

          <div className="border-t pt-4 flex items-center justify-between gap-6 flex-wrap">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-lg font-bold leading-none">${monthlyIncome.toLocaleString()}/mo</p>
                <p className="text-xs text-gray-400 mt-0.5">Income, {ownerships.length} unit{ownerships.length !== 1 ? "s" : ""}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Expenses</p>
              <p className="text-xs text-gray-400">Dues &amp; expense tracking coming soon</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div>
        <h2 className="text-sm font-medium text-gray-500 mb-3">Your Units</h2>
        <div className="space-y-6">
      {ownerships.map((ownership) => {
        const { unit } = ownership
        const activeLease = unit.leases[0]
        const sb = statusBadge(unit.status)

        return (
          <Card key={unit.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">
                  Unit {unit.number}
                  {unit.building && ` — Building ${unit.building}`}
                </CardTitle>
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${sb.color}`}>
                  {sb.label}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1">
                <div className="flex gap-4 text-sm text-gray-500">
                  {unit.bedrooms && <span>{unit.bedrooms} bed</span>}
                  {unit.bathrooms && <span>{unit.bathrooms} bath</span>}
                  {unit.sqft && <span>{unit.sqft.toLocaleString()} sqft</span>}
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/dashboard/owner/units/${unit.id}#occupancy-calendar`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  >
                    <CalendarDays className="h-3.5 w-3.5" /> Occupancy Calendar
                  </Link>
                  <Link
                    href={`/dashboard/owner/units/${unit.id}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "gap-1.5")}
                  >
                    <Settings className="h-3.5 w-3.5" /> Manage Unit
                  </Link>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <RentalPolicyForm
                ownershipId={ownership.id}
                unitId={unit.id}
                currentPolicy={ownership.rentalPolicy}
                currentNotes={ownership.notes ?? ""}
              />

              {activeLease && (
                <div className="bg-green-50 rounded-lg p-3 border border-green-100">
                  <p className="text-sm font-medium text-green-800 mb-1">Current Renter</p>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">{activeLease.renter.name}</p>
                      <p className="text-xs text-gray-500">{activeLease.renter.email}</p>
                      {activeLease.renter.phone && (
                        <p className="text-xs text-gray-500">{activeLease.renter.phone}</p>
                      )}
                    </div>
                    {activeLease.monthlyRent && (
                      <p className="text-sm font-bold text-green-700">
                        ${activeLease.monthlyRent.toLocaleString()}/mo
                      </p>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Since {new Date(activeLease.startDate).toLocaleDateString()}
                    {activeLease.endDate &&
                      ` · Until ${new Date(activeLease.endDate).toLocaleDateString()}`}
                  </p>
                </div>
              )}

              {unit.tickets.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Recent Tickets</p>
                  <div className="space-y-2">
                    {unit.tickets.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between text-sm bg-gray-50 rounded px-3 py-2"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <p className="truncate">{t.title}</p>
                          <p className="text-xs text-gray-400 truncate">
                            Submitted by {t.submittedBy.name ?? t.submittedBy.email} on {formatDateTime(t.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <Badge className={`text-xs ${priorityBadge(t.priority)}`}>
                            {t.priority}
                          </Badge>
                          <Badge className={`text-xs ${ticketBadge(t.status)}`}>
                            {t.status.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {ownerships.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            <Building2 className="h-10 w-10 mx-auto mb-3 text-gray-300" />
            <p>No units assigned yet. Contact your property manager.</p>
          </CardContent>
        </Card>
      )}
        </div>
      </div>
    </div>
  )
}
