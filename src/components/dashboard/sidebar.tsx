"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Building2, Home, Users, Wrench, FileText,
  TicketIcon, LayoutDashboard, ChevronRight, ChevronDown, Mail, Settings, ShieldCheck, Landmark, DollarSign, Megaphone, Receipt, PiggyBank, TableProperties, TrendingDown, CalendarDays, FileBarChart,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/generated/prisma"

type NavItem = { label: string; href: string; icon: React.ElementType; indent?: boolean }
type NavGroup = { label: string; icon: React.ElementType; children: NavItem[] }
type NavEntry = NavItem | NavGroup

function isGroup(entry: NavEntry): entry is NavGroup {
  return "children" in entry
}

const navByRole: Record<Role, NavEntry[]> = {
  ACCOUNT_OWNER: [
    { label: "Units", href: "/dashboard/account/units", icon: Building2 },
    { label: "Members", href: "/dashboard/account/members", icon: Users },
    { label: "Board", href: "/dashboard/account/board", icon: Landmark },
    { label: "Property Manager", href: "/dashboard/account/pm", icon: Wrench },
    { label: "Contracts", href: "/dashboard/account/contracts", icon: FileText },
    { label: "Contractors", href: "/dashboard/account/contractors", icon: Wrench, indent: true },
    { label: "Compliance", href: "/dashboard/account/compliance", icon: ShieldCheck },
  ],
  OWNER: [
    { label: "Financial", href: "/dashboard/owner/financial", icon: DollarSign },
    { label: "Dues & Assessments", href: "/dashboard/owner/financial/dues", icon: Receipt, indent: true },
    { label: "Contracts", href: "/dashboard/owner/financial/contracts", icon: FileText, indent: true },
    { label: "Expenses", href: "/dashboard/owner/financial/expenses", icon: TrendingDown, indent: true },
    { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon },
    { label: "Governance", href: "/dashboard/owner/governance", icon: Landmark },
    { label: "Property Manager", href: "/dashboard/owner/property-manager", icon: Wrench },
    { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2 },
    { label: "Rental Pool", href: "/dashboard/owner/rental-pool", icon: Home, indent: true },
  ],
  RENTER: [
    { label: "Submit Ticket", href: "/dashboard/renter/tickets/new", icon: TicketIcon },
    { label: "My Tickets", href: "/dashboard/renter/tickets", icon: FileText },
  ],
  // Grouped into collapsible sections (2026-08-14) - the PM role otherwise
  // carries the widest surface of any role (finances, units, governance
  // contacts, staff, tickets...), and a flat list of ~17 items buried the
  // few things a PM actually needs day-to-day under a wall of navigation.
  // Each existing standalone "overview" page (finances/units/key-info
  // landing pages) becomes that group's first child rather than trying to
  // make the group header double as both a link and a toggle.
  PROPERTY_MANAGER: [
    { label: "Reports", href: "/dashboard/property-manager/reports", icon: FileBarChart },
    { label: "All Tickets", href: "/dashboard/property-manager/tickets", icon: TicketIcon },
    {
      label: "Finances",
      icon: DollarSign,
      children: [
        { label: "Overview", href: "/dashboard/property-manager/finances", icon: DollarSign },
        { label: "Dues & Assessments", href: "/dashboard/property-manager/finances/assessments", icon: Receipt },
        { label: "Reserve Fund", href: "/dashboard/property-manager/finances/reserve", icon: PiggyBank },
        { label: "Multi-Year Comparison", href: "/dashboard/property-manager/finances/comparison", icon: TableProperties },
      ],
    },
    {
      label: "Units",
      icon: Building2,
      children: [
        { label: "Owner Directory", href: "/dashboard/property-manager/owners", icon: Users },
        { label: "Unit Availability", href: "/dashboard/property-manager/units", icon: Building2 },
        { label: "Occupancy", href: "/dashboard/property-manager/occupancy", icon: CalendarDays },
      ],
    },
    {
      label: "Key Information",
      icon: Landmark,
      children: [
        { label: "Overview", href: "/dashboard/property-manager/key-info", icon: Landmark },
        { label: "PM Company Profile", href: "/dashboard/property-manager/company", icon: Settings },
        { label: "Staff", href: "/dashboard/property-manager/staff", icon: Users },
      ],
    },
    { label: "Announcements", href: "/dashboard/property-manager/announcements", icon: Megaphone },
    { label: "Documents", href: "/dashboard/property-manager/documents", icon: FileText },
    { label: "Contracts", href: "/dashboard/property-manager/contracts", icon: FileText },
    { label: "Contractors", href: "/dashboard/property-manager/contractors", icon: Wrench, indent: true },
    { label: "Compliance", href: "/dashboard/property-manager/compliance", icon: ShieldCheck },
  ],
  CONTRACTOR: [
    { label: "Work Orders", href: "/dashboard/contractor/tickets", icon: TicketIcon },
    { label: "My Contracts", href: "/dashboard/contractor/contracts", icon: FileText },
  ],
  // Grouped into collapsible sections (2026-08-17), mirroring the
  // PROPERTY_MANAGER treatment above - Board carries a similar breadth
  // (finances, governance records, property/units, tickets...) and the flat
  // 15-item list buried day-to-day items the same way.
  BOARD_MEMBER: [
    { label: "Key Information", href: "/dashboard/board/key-info", icon: Landmark },
    {
      label: "Finances",
      icon: DollarSign,
      children: [
        { label: "Overview", href: "/dashboard/board/finances", icon: DollarSign },
        { label: "Dues & Assessments", href: "/dashboard/board/finances/assessments", icon: Receipt },
        { label: "Reserve Fund", href: "/dashboard/board/finances/reserve", icon: PiggyBank },
        { label: "Multi-Year Comparison", href: "/dashboard/board/finances/comparison", icon: TableProperties },
      ],
    },
    { label: "Reports", href: "/dashboard/board/reports", icon: FileBarChart },
    { label: "Property Manager", href: "/dashboard/board/pm", icon: Wrench },
    { label: "All Tickets", href: "/dashboard/board/tickets", icon: TicketIcon },
    {
      label: "Governance",
      icon: Megaphone,
      children: [
        { label: "Board Composition", href: "/dashboard/board/board", icon: Landmark },
        { label: "Meetings", href: "/dashboard/board/meetings", icon: Users },
        { label: "Announcements", href: "/dashboard/board/announcements", icon: Megaphone },
        { label: "Documents", href: "/dashboard/board/documents", icon: FileText },
      ],
    },
    { label: "Occupancy", href: "/dashboard/board/occupancy", icon: CalendarDays },
    { label: "Contracts", href: "/dashboard/board/contracts", icon: FileText },
    { label: "Contractors", href: "/dashboard/board/contractors", icon: Wrench, indent: true },
    { label: "Compliance", href: "/dashboard/board/compliance", icon: ShieldCheck },
  ],
  UNIT_MANAGER: [
    { label: "My Units", href: "/dashboard/unit-manager", icon: LayoutDashboard },
    { label: "My Profile", href: "/dashboard/unit-manager/profile", icon: Settings },
  ],
}

const roleLabels: Record<Role, string> = {
  ACCOUNT_OWNER: "Account Holder",
  OWNER: "Owner Portal",
  RENTER: "Renter Portal",
  PROPERTY_MANAGER: "Manager Portal",
  CONTRACTOR: "Contractor Portal",
  BOARD_MEMBER: "Board Portal",
  UNIT_MANAGER: "Unit Manager Portal",
}

export function DashboardSidebar({
  role,
  isBoardMember,
  orgName,
  ownsUnit,
}: {
  role: Role
  isBoardMember: boolean
  orgName: string
  ownsUnit?: boolean
}) {
  const pathname = usePathname()
  // Copy - navByRole is a module-level singleton, and splicing below must
  // not mutate it or the injected item would leak into every render.
  const navItems: NavEntry[] = [...(navByRole[role] ?? [])]

  // isBoardMember is independent of the primary role (see schema.prisma) -
  // an Owner who also holds Board governance access gets a sub-tab under
  // their own Governance page, rather than a second role/portal.
  if (role === "OWNER" && isBoardMember) {
    const governanceIndex = navItems.findIndex((item) => !isGroup(item) && item.href === "/dashboard/owner/governance")
    if (governanceIndex !== -1) {
      navItems.splice(governanceIndex + 1, 0, {
        label: "Board",
        href: "/dashboard/owner/governance/board",
        icon: Landmark,
        indent: true,
      })
    }
  }

  // Mirror image of the splice above: a custodian who has also personally
  // claimed a unit (see claimOwnUnit / requireOwnerAccess) gets the same
  // unit-scoped pages an OWNER sees, appended rather than swapping their
  // whole nav - they're still primarily the Account admin.
  if (role === "ACCOUNT_OWNER" && ownsUnit) {
    navItems.push(
      { label: "My Unit", href: "/dashboard/owner", icon: Home },
      { label: "Financial", href: "/dashboard/owner/financial", icon: DollarSign, indent: true },
      { label: "Dues & Assessments", href: "/dashboard/owner/financial/dues", icon: Receipt, indent: true },
      { label: "Expenses", href: "/dashboard/owner/financial/expenses", icon: TrendingDown, indent: true },
      { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon, indent: true },
      { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2, indent: true }
    )
  }

  // Flatten to just the leaf (linkable) items for active-path matching -
  // a group header itself has no href to match against.
  const leafItems = navItems.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]))
  // The most specific href match wins - without this, a nested route like
  // /financial/contracts would highlight both "Financial" and "Contracts"
  // at once, since a plain prefix check matches both of their hrefs.
  const bestMatch = leafItems
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const entry of navItems) {
      if (isGroup(entry) && entry.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        initial.add(entry.label)
      }
    }
    return initial
  })

  // Auto-expand (never auto-collapse) whichever group contains the page
  // just navigated to, so following a link never leaves you looking at a
  // page with its own sidebar entry hidden inside a closed group.
  useEffect(() => {
    for (const entry of navItems) {
      if (isGroup(entry) && entry.children.some((c) => pathname === c.href || pathname.startsWith(c.href + "/"))) {
        setExpanded((prev) => (prev.has(entry.label) ? prev : new Set(prev).add(entry.label)))
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  function toggle(label: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  return (
    <aside className="w-64 bg-white border-r flex flex-col shrink-0 print:hidden">
      <div className="p-4 border-b space-y-2">
        <Link href="/dashboard">
          <Image src="/HOPE-logo.png" alt="HOPE" height={36} width={120} className="object-contain" />
        </Link>
        <p className="font-semibold text-gray-900 text-sm truncate" title={orgName}>
          {orgName}
        </p>
        <span className="inline-block text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {roleLabels[role].toUpperCase()}
        </span>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((entry) => {
          if (isGroup(entry)) {
            const isOpen = expanded.has(entry.label)
            const groupActive = entry.children.some((c) => c === bestMatch)
            return (
              <div key={entry.label}>
                <button
                  type="button"
                  onClick={() => toggle(entry.label)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors cursor-pointer",
                    groupActive && !isOpen
                      ? "bg-gray-900 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                  )}
                >
                  <entry.icon className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">{entry.label}</span>
                  {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {entry.children.map((item) => {
                      const isActive = item === bestMatch
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 ml-4 px-3 py-2 rounded-lg text-[13px] transition-colors",
                            isActive
                              ? "bg-gray-900 text-white font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          )}
                        >
                          <item.icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{item.label}</span>
                          {isActive && <ChevronRight className="h-3 w-3" />}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          }

          const isActive = entry === bestMatch
          return (
            <Link
              key={entry.href}
              href={entry.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                entry.indent && "ml-4 text-[13px]",
                isActive
                  ? "bg-gray-900 text-white font-medium"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              )}
            >
              <entry.icon className="h-4 w-4 shrink-0" />
              <span className="flex-1">{entry.label}</span>
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
