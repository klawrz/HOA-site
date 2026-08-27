"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Building2, Home, Users, Wrench, FileText,
  TicketIcon, LayoutDashboard, ChevronRight, ChevronDown, Mail, Settings, ShieldCheck, Landmark, DollarSign, Megaphone, Receipt, PiggyBank, TableProperties, TrendingDown, CalendarDays, FileBarChart, ListChecks, CheckCircle2, Lock,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/generated/prisma"
import { roleForPathname, ROLE_HOME } from "@/lib/role-access"
import { Eye, X } from "lucide-react"

// The fixed set of categories every role's nav is organized into, in the
// order they always appear - Shopify-style unified nav (2026-08-27, per
// Dara): everyone sees the same master list of categories in the same
// slots; a role with nothing real in a category gets a dimmed, inert
// placeholder there instead of the category just not existing for them.
// Consistency across roles (and pairs naturally with "View as...") beats
// each role having its own bespoke ordering.
type CategoryKey =
  | "key_info" | "financials" | "units" | "tickets" | "governance"
  | "property_manager" | "contracts" | "compliance" | "reports" | "setup" | "profile"

const CATEGORY_META: Record<CategoryKey, { label: string; icon: React.ElementType }> = {
  key_info: { label: "Key Information", icon: Landmark },
  financials: { label: "Financials", icon: DollarSign },
  units: { label: "Units", icon: Building2 },
  tickets: { label: "Tickets", icon: TicketIcon },
  governance: { label: "Governance", icon: Megaphone },
  property_manager: { label: "Property Manager", icon: Wrench },
  contracts: { label: "Contracts", icon: FileText },
  compliance: { label: "Compliance", icon: ShieldCheck },
  reports: { label: "Reports", icon: FileBarChart },
  setup: { label: "Setup", icon: ListChecks },
  profile: { label: "Profile", icon: Settings },
}

const CATEGORY_ORDER: CategoryKey[] = [
  "key_info", "financials", "units", "tickets", "governance",
  "property_manager", "contracts", "compliance", "reports", "setup", "profile",
]

type NavItem = { label: string; href: string; icon: React.ElementType; indent?: boolean }
type NavGroup = { label: string; icon: React.ElementType; children: NavItem[] }
// category lives on the top-level entry only - a group's own children don't
// need one, the whole group occupies its category's single slot.
type NavEntry = (NavItem | NavGroup) & { category: CategoryKey }

function isGroup(entry: NavEntry): entry is NavGroup & { category: CategoryKey } {
  return "children" in entry
}

const navByRole: Record<Role, NavEntry[]> = {
  ACCOUNT_OWNER: [
    { label: "Setup Status", href: "/dashboard/account/setup", icon: ListChecks, category: "setup" },
    { label: "Setup Units", href: "/dashboard/account/units", icon: Building2, category: "setup" },
    { label: "Setup Owners", href: "/dashboard/account/members", icon: Users, category: "setup" },
    { label: "Setup Board", href: "/dashboard/account/board", icon: Landmark, category: "setup" },
    { label: "Setup PM", href: "/dashboard/account/pm", icon: Wrench, category: "setup" },
    { label: "Contracts", href: "/dashboard/account/contracts", icon: FileText, category: "contracts" },
    { label: "Contractors", href: "/dashboard/account/contractors", icon: Wrench, indent: true, category: "contracts" },
    { label: "Compliance", href: "/dashboard/account/compliance", icon: ShieldCheck, category: "compliance" },
  ],
  OWNER: [
    { label: "Financial", href: "/dashboard/owner/financial", icon: DollarSign, category: "financials" },
    { label: "Dues & Assessments", href: "/dashboard/owner/financial/dues", icon: Receipt, indent: true, category: "financials" },
    { label: "Contracts", href: "/dashboard/owner/financial/contracts", icon: FileText, indent: true, category: "financials" },
    { label: "Expenses", href: "/dashboard/owner/financial/expenses", icon: TrendingDown, indent: true, category: "financials" },
    { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon, category: "tickets" },
    { label: "Governance", href: "/dashboard/owner/governance", icon: Landmark, category: "governance" },
    { label: "Property Manager", href: "/dashboard/owner/property-manager", icon: Wrench, category: "property_manager" },
    { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2, category: "units" },
    { label: "Rental Pool", href: "/dashboard/owner/rental-pool", icon: Home, indent: true, category: "units" },
  ],
  RENTER: [
    { label: "Submit Ticket", href: "/dashboard/renter/tickets/new", icon: TicketIcon, category: "tickets" },
    { label: "My Tickets", href: "/dashboard/renter/tickets", icon: FileText, category: "tickets" },
  ],
  // Grouped into collapsible sections (2026-08-14) - the PM role otherwise
  // carries the widest surface of any role (finances, units, governance
  // contacts, staff, tickets...), and a flat list of ~17 items buried the
  // few things a PM actually needs day-to-day under a wall of navigation.
  // Each existing standalone "overview" page (finances/units/key-info
  // landing pages) becomes that group's first child rather than trying to
  // make the group header double as both a link and a toggle.
  PROPERTY_MANAGER: [
    { label: "Reports", href: "/dashboard/property-manager/reports", icon: FileBarChart, category: "reports" },
    { label: "All Tickets", href: "/dashboard/property-manager/tickets", icon: TicketIcon, category: "tickets" },
    {
      label: "Finances",
      icon: DollarSign,
      category: "financials",
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
      category: "units",
      children: [
        { label: "Owner Directory", href: "/dashboard/property-manager/owners", icon: Users },
        { label: "Unit Availability", href: "/dashboard/property-manager/units", icon: Building2 },
        { label: "Occupancy", href: "/dashboard/property-manager/occupancy", icon: CalendarDays },
      ],
    },
    {
      label: "Key Information",
      icon: Landmark,
      category: "key_info",
      children: [
        { label: "Overview", href: "/dashboard/property-manager/key-info", icon: Landmark },
        { label: "PM Company Profile", href: "/dashboard/property-manager/company", icon: Settings },
        { label: "Staff", href: "/dashboard/property-manager/staff", icon: Users },
      ],
    },
    // Tagged "governance" (not their own top-level slot) so PM's
    // Announcements/Documents line up in the same category slot Board's
    // Governance group occupies - same unification goal, no page moved.
    { label: "Announcements", href: "/dashboard/property-manager/announcements", icon: Megaphone, category: "governance" },
    { label: "Documents", href: "/dashboard/property-manager/documents", icon: FileText, category: "governance" },
    { label: "Contracts", href: "/dashboard/property-manager/contracts", icon: FileText, category: "contracts" },
    { label: "Contractors", href: "/dashboard/property-manager/contractors", icon: Wrench, indent: true, category: "contracts" },
    { label: "Compliance", href: "/dashboard/property-manager/compliance", icon: ShieldCheck, category: "compliance" },
  ],
  CONTRACTOR: [
    { label: "Work Orders", href: "/dashboard/contractor/tickets", icon: TicketIcon, category: "tickets" },
    { label: "My Contracts", href: "/dashboard/contractor/contracts", icon: FileText, category: "contracts" },
  ],
  // Grouped into collapsible sections (2026-08-17), mirroring the
  // PROPERTY_MANAGER treatment above - Board carries a similar breadth
  // (finances, governance records, property/units, tickets...) and the flat
  // 15-item list buried day-to-day items the same way.
  BOARD_MEMBER: [
    { label: "Key Information", href: "/dashboard/board/key-info", icon: Landmark, category: "key_info" },
    {
      label: "Finances",
      icon: DollarSign,
      category: "financials",
      children: [
        { label: "Overview", href: "/dashboard/board/finances", icon: DollarSign },
        { label: "Dues & Assessments", href: "/dashboard/board/finances/assessments", icon: Receipt },
        { label: "Reserve Fund", href: "/dashboard/board/finances/reserve", icon: PiggyBank },
        { label: "Multi-Year Comparison", href: "/dashboard/board/finances/comparison", icon: TableProperties },
      ],
    },
    { label: "Reports", href: "/dashboard/board/reports", icon: FileBarChart, category: "reports" },
    { label: "Property Manager", href: "/dashboard/board/pm", icon: Wrench, category: "property_manager" },
    { label: "All Tickets", href: "/dashboard/board/tickets", icon: TicketIcon, category: "tickets" },
    {
      label: "Governance",
      icon: Megaphone,
      category: "governance",
      children: [
        { label: "Board Composition", href: "/dashboard/board/board", icon: Landmark },
        { label: "Setup Status", href: "/dashboard/account/setup", icon: ListChecks },
        { label: "Meetings", href: "/dashboard/board/meetings", icon: Users },
        { label: "Announcements", href: "/dashboard/board/announcements", icon: Megaphone },
        { label: "Documents", href: "/dashboard/board/documents", icon: FileText },
      ],
    },
    { label: "Units", href: "/dashboard/board/units", icon: Building2, category: "units" },
    { label: "Occupancy", href: "/dashboard/board/occupancy", icon: CalendarDays, category: "units" },
    { label: "Contracts", href: "/dashboard/board/contracts", icon: FileText, category: "contracts" },
    { label: "Contractors", href: "/dashboard/board/contractors", icon: Wrench, indent: true, category: "contracts" },
    { label: "Compliance", href: "/dashboard/board/compliance", icon: ShieldCheck, category: "compliance" },
  ],
  UNIT_MANAGER: [
    { label: "My Units", href: "/dashboard/unit-manager", icon: LayoutDashboard, category: "units" },
    { label: "My Profile", href: "/dashboard/unit-manager/profile", icon: Settings, category: "profile" },
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

// Maps a nav item's href to the matching key in setupProgress - checked
// off as the custodian completes each step, so progress is visible right
// in the sidebar instead of only on the separate Setup Status page.
const SETUP_PROGRESS_HREFS: Record<string, keyof NonNullable<SetupProgress>> = {
  "/dashboard/account/units": "units",
  "/dashboard/account/members": "members",
  "/dashboard/account/board": "board",
  "/dashboard/account/pm": "pm",
}

type SetupProgress = { units: boolean; members: boolean; board: boolean; pm: boolean } | undefined

// What has to be done before each "Setup X" link reveals itself - Setup
// Units is always visible; Owners needs Units; Board and PM both just need
// Owners; done in PARALLEL with each other rather than PM waiting on Board,
// since there's no real dependency between them and the custodian may want
// either first (see the "any order" framing already established for this
// whole flow). This only hides the *shortcut* - the pages themselves are
// still reachable directly (Setup Status, a bookmark, the wizard)
// regardless of what's revealed here, so nothing is actually order-gated,
// just the sidebar's suggested path.
const SETUP_REVEAL_DEPENDS_ON: Partial<Record<keyof NonNullable<SetupProgress>, keyof NonNullable<SetupProgress>>> = {
  members: "units",
  board: "members",
  pm: "members",
}

export function DashboardSidebar({
  role,
  isBoardMember,
  orgName,
  ownsUnit,
  setupProgress,
}: {
  role: Role
  isBoardMember: boolean
  orgName: string
  ownsUnit?: boolean
  setupProgress?: SetupProgress
}) {
  const pathname = usePathname()
  // Which role's nav to actually show - normally just `role`, but an
  // Account Owner previewing another role's section (see "View as..." in
  // the header) needs THAT role's sidebar, not their own, or the switch
  // looks incomplete (Board content with the Account Owner's own nav and
  // "My Unit" still wrapped around it - exactly what was reported
  // 2026-08-27). Everyone else always just gets their own role's nav.
  const previewRole = roleForPathname(pathname, role)
  const isPreviewing = previewRole !== role
  // Copy - navByRole is a module-level singleton, and splicing below must
  // not mutate it or the injected item would leak into every render.
  const navItems: NavEntry[] = [...(navByRole[previewRole] ?? [])]

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
        category: "governance",
      })
    }
  }

  // Same dual-role idea as the OWNER+isBoardMember splice above, for an
  // Account Owner who's also personally a Board Member (single signin,
  // per Dara 2026-08-27 - a real person, not two accounts). Links straight
  // at the shared /dashboard/board/units page rather than a duplicated
  // Account-scoped route, since that page's own permission check already
  // accepts isBoardMember regardless of primary role. Guarded on
  // !isPreviewing - these are the real Account Owner's own extra capacities,
  // appended to THEIR OWN nav only, never onto another role's nav while
  // previewing (that was the actual "Villa 1 in the Board Financials" bug,
  // 2026-08-27 - this splice used to fire unconditionally).
  if (role === "ACCOUNT_OWNER" && isBoardMember && !isPreviewing) {
    navItems.push({ label: "Board Units", href: "/dashboard/board/units", icon: Landmark, category: "units" })
  }

  // Mirror image of the splice above: a custodian who has also personally
  // claimed a unit (see claimOwnUnit / requireOwnerAccess) gets the same
  // unit-scoped pages an OWNER sees, appended rather than swapping their
  // whole nav - they're still primarily the Account admin. Same
  // !isPreviewing guard as above, same reason.
  if (role === "ACCOUNT_OWNER" && ownsUnit && !isPreviewing) {
    navItems.push(
      { label: "My Unit", href: "/dashboard/owner", icon: Home, category: "units" },
      { label: "Financial", href: "/dashboard/owner/financial", icon: DollarSign, indent: true, category: "financials" },
      { label: "Dues & Assessments", href: "/dashboard/owner/financial/dues", icon: Receipt, indent: true, category: "financials" },
      { label: "Expenses", href: "/dashboard/owner/financial/expenses", icon: TrendingDown, indent: true, category: "financials" },
      { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon, indent: true, category: "tickets" },
      { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2, indent: true, category: "units" }
    )
  }

  // Reveal each "Setup X" link only once the previous one in the sequence
  // is done - see SETUP_REVEAL_ORDER. Filtered here (not at the navByRole
  // source) so it only ever affects ACCOUNT_OWNER's own sidebar, and only
  // once setupProgress has actually loaded (undefined for every other
  // role, where SETUP_PROGRESS_HREFS has no matching hrefs anyway).
  const visibleNavItems = navItems.filter((entry) => {
    if (isGroup(entry)) return true
    const key = SETUP_PROGRESS_HREFS[entry.href]
    if (!key) return true
    const dependsOn = SETUP_REVEAL_DEPENDS_ON[key]
    if (!dependsOn) return true
    return !!setupProgress?.[dependsOn]
  })

  // Unified nav (2026-08-27): reorder this role's own entries into the
  // fixed master CATEGORY_ORDER, and drop in an inert, dimmed placeholder
  // for any category this role has nothing real in - so everyone sees the
  // same list of categories in the same slots, exactly which ones light up
  // just depends on the role. Nothing about an entry itself changes here,
  // only its position and whether a placeholder fills its category's slot.
  type Placeholder = { placeholder: true; category: CategoryKey }
  const byCategory = new Map<CategoryKey, NavEntry[]>()
  for (const entry of visibleNavItems) {
    const bucket = byCategory.get(entry.category)
    if (bucket) bucket.push(entry)
    else byCategory.set(entry.category, [entry])
  }
  const orderedEntries: (NavEntry | Placeholder)[] = CATEGORY_ORDER.flatMap<NavEntry | Placeholder>(
    (key) => byCategory.get(key) ?? [{ placeholder: true, category: key }]
  )

  // Flatten to just the leaf (linkable) items for active-path matching -
  // a group header itself has no href to match against. Placeholders have
  // no href either and are excluded automatically (isGroup/href checks
  // below only ever run against real entries).
  const leafItems = visibleNavItems.flatMap((entry) => (isGroup(entry) ? entry.children : [entry]))
  // The most specific href match wins - without this, a nested route like
  // /financial/contracts would highlight both "Financial" and "Contracts"
  // at once, since a plain prefix check matches both of their hrefs.
  const bestMatch = leafItems
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]

  const [expanded, setExpanded] = useState<Set<string>>(() => {
    const initial = new Set<string>()
    for (const entry of visibleNavItems) {
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
    for (const entry of visibleNavItems) {
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
    <aside className="w-64 bg-white border-r flex flex-col shrink-0 min-h-0 print:hidden">
      <div className="p-4 border-b space-y-2">
        <Link href="/dashboard">
          <Image src="/HOPE-logo.png" alt="HOPE" height={36} width={120} className="object-contain" />
        </Link>
        <p className="font-semibold text-gray-900 text-sm truncate" title={orgName}>
          {orgName}
        </p>
        <span className="inline-block text-[11px] font-semibold tracking-wide px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {roleLabels[previewRole].toUpperCase()}
        </span>
        {isPreviewing && (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-full px-2 py-0.5 w-fit">
            <Eye className="h-3 w-3 shrink-0" />
            <span>Previewing</span>
            <Link href={ROLE_HOME[role]} className="ml-0.5 hover:text-amber-900" title="Back to Account Holder">
              <X className="h-3 w-3" />
            </Link>
          </div>
        )}
      </div>
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto min-h-0">
        {orderedEntries.map((entry) => {
          if ("placeholder" in entry) {
            const meta = CATEGORY_META[entry.category]
            return (
              <div
                key={`placeholder-${entry.category}`}
                title="Not part of your current role"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-300 cursor-not-allowed select-none"
              >
                <meta.icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{meta.label}</span>
                <Lock className="h-3 w-3 shrink-0" />
              </div>
            )
          }

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
          const progressKey = SETUP_PROGRESS_HREFS[entry.href]
          const isDone = progressKey ? setupProgress?.[progressKey] : false
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
              {isDone && (
                <CheckCircle2
                  className={cn("h-3.5 w-3.5 shrink-0", isActive ? "text-green-400" : "text-green-600")}
                  aria-label="Set up"
                />
              )}
              {isActive && <ChevronRight className="h-3 w-3" />}
            </Link>
          )
        })}
      </nav>
    </aside>
  )
}
