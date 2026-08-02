"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Building2, Home, Users, Wrench, FileText,
  TicketIcon, LayoutDashboard, ChevronRight, Mail, Settings, ShieldCheck, Landmark, DollarSign, Megaphone, Receipt, PiggyBank, TableProperties, TrendingDown, CalendarDays,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/generated/prisma"

type NavItem = { label: string; href: string; icon: React.ElementType; indent?: boolean }

const navByRole: Record<Role, NavItem[]> = {
  ACCOUNT_OWNER: [
    { label: "Dashboard", href: "/dashboard/account", icon: LayoutDashboard },
    { label: "Units", href: "/dashboard/account/units", icon: Building2 },
    { label: "Members", href: "/dashboard/account/members", icon: Users },
    { label: "Board", href: "/dashboard/account/board", icon: Landmark },
    { label: "Property Manager", href: "/dashboard/account/pm", icon: Wrench },
    { label: "Contracts", href: "/dashboard/account/contracts", icon: FileText },
    { label: "Contractors", href: "/dashboard/account/contractors", icon: Wrench, indent: true },
    { label: "Compliance", href: "/dashboard/account/compliance", icon: ShieldCheck },
  ],
  OWNER: [
    { label: "My Dashboard", href: "/dashboard/owner", icon: LayoutDashboard },
    { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2 },
    { label: "Rental Pool", href: "/dashboard/owner/rental-pool", icon: Home, indent: true },
    { label: "Financial", href: "/dashboard/owner/financial", icon: DollarSign },
    { label: "Dues & Assessments", href: "/dashboard/owner/financial/dues", icon: Receipt, indent: true },
    { label: "Contracts", href: "/dashboard/owner/financial/contracts", icon: FileText, indent: true },
    { label: "Expenses", href: "/dashboard/owner/financial/expenses", icon: TrendingDown, indent: true },
    { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon },
    { label: "Governance", href: "/dashboard/owner/governance", icon: Landmark },
    { label: "Property Manager", href: "/dashboard/owner/property-manager", icon: Wrench },
  ],
  RENTER: [
    { label: "My Dashboard", href: "/dashboard/renter", icon: LayoutDashboard },
    { label: "Submit Ticket", href: "/dashboard/renter/tickets/new", icon: TicketIcon },
    { label: "My Tickets", href: "/dashboard/renter/tickets", icon: FileText },
  ],
  PROPERTY_MANAGER: [
    { label: "Dashboard", href: "/dashboard/property-manager", icon: LayoutDashboard },
    { label: "Unit Availability", href: "/dashboard/property-manager/units", icon: Building2 },
    { label: "Owner Directory", href: "/dashboard/property-manager/owners", icon: Users },
    { label: "Occupancy", href: "/dashboard/property-manager/occupancy", icon: CalendarDays },
    { label: "Announcements", href: "/dashboard/property-manager/announcements", icon: Megaphone },
    { label: "Documents", href: "/dashboard/property-manager/documents", icon: FileText },
    { label: "Key Information", href: "/dashboard/property-manager/key-info", icon: Landmark },
    { label: "Finances", href: "/dashboard/property-manager/finances", icon: DollarSign },
    { label: "Dues & Assessments", href: "/dashboard/property-manager/finances/assessments", icon: Receipt, indent: true },
    { label: "Reserve Fund", href: "/dashboard/property-manager/finances/reserve", icon: PiggyBank, indent: true },
    { label: "Multi-Year Comparison", href: "/dashboard/property-manager/finances/comparison", icon: TableProperties, indent: true },
    { label: "All Tickets", href: "/dashboard/property-manager/tickets", icon: TicketIcon },
    { label: "Company Profile", href: "/dashboard/property-manager/company", icon: Settings },
    { label: "Staff", href: "/dashboard/property-manager/staff", icon: Users },
    { label: "Contracts", href: "/dashboard/property-manager/contracts", icon: FileText },
    { label: "Contractors", href: "/dashboard/property-manager/contractors", icon: Wrench, indent: true },
    { label: "Compliance", href: "/dashboard/property-manager/compliance", icon: ShieldCheck },
  ],
  CONTRACTOR: [
    { label: "Dashboard", href: "/dashboard/contractor", icon: LayoutDashboard },
    { label: "Work Orders", href: "/dashboard/contractor/tickets", icon: TicketIcon },
    { label: "My Contracts", href: "/dashboard/contractor/contracts", icon: FileText },
  ],
  BOARD_MEMBER: [
    { label: "Dashboard", href: "/dashboard/board", icon: LayoutDashboard },
    { label: "Occupancy", href: "/dashboard/board/occupancy", icon: CalendarDays },
    { label: "Announcements", href: "/dashboard/board/announcements", icon: Megaphone },
    { label: "Meetings", href: "/dashboard/board/meetings", icon: Users },
    { label: "Documents", href: "/dashboard/board/documents", icon: FileText },
    { label: "Key Information", href: "/dashboard/board/key-info", icon: Landmark },
    { label: "Finances", href: "/dashboard/board/finances", icon: DollarSign },
    { label: "Dues & Assessments", href: "/dashboard/board/finances/assessments", icon: Receipt, indent: true },
    { label: "Reserve Fund", href: "/dashboard/board/finances/reserve", icon: PiggyBank, indent: true },
    { label: "Multi-Year Comparison", href: "/dashboard/board/finances/comparison", icon: TableProperties, indent: true },
    { label: "Property Manager", href: "/dashboard/board/pm", icon: Wrench },
    { label: "Contracts", href: "/dashboard/board/contracts", icon: FileText },
    { label: "Contractors", href: "/dashboard/board/contractors", icon: Wrench, indent: true },
    { label: "Compliance", href: "/dashboard/board/compliance", icon: ShieldCheck },
    { label: "All Tickets", href: "/dashboard/board/tickets", icon: TicketIcon },
  ],
  UNIT_MANAGER: [
    { label: "My Units", href: "/dashboard/unit-manager", icon: LayoutDashboard },
    { label: "My Profile", href: "/dashboard/unit-manager/profile", icon: Settings },
  ],
}

const roleLabels: Record<Role, string> = {
  ACCOUNT_OWNER: "Account Owner",
  OWNER: "Owner Portal",
  RENTER: "Renter Portal",
  PROPERTY_MANAGER: "Manager Portal",
  CONTRACTOR: "Contractor Portal",
  BOARD_MEMBER: "Board Portal",
  UNIT_MANAGER: "Unit Manager Portal",
}

export function DashboardSidebar({ role, isBoardMember }: { role: Role; isBoardMember: boolean }) {
  const pathname = usePathname()
  // Copy - navByRole is a module-level singleton, and splicing below must
  // not mutate it or the injected item would leak into every render.
  const navItems = [...(navByRole[role] ?? [])]

  // isBoardMember is independent of the primary role (see schema.prisma) -
  // an Owner who also holds Board governance access gets a sub-tab under
  // their own Governance page, rather than a second role/portal.
  if (role === "OWNER" && isBoardMember) {
    const governanceIndex = navItems.findIndex((item) => item.href === "/dashboard/owner/governance")
    if (governanceIndex !== -1) {
      navItems.splice(governanceIndex + 1, 0, {
        label: "Board",
        href: "/dashboard/owner/governance/board",
        icon: Landmark,
        indent: true,
      })
    }
  }

  // The most specific href match wins - without this, a nested route like
  // /financial/contracts would highlight both "Financial" and "Contracts"
  // at once, since a plain prefix check matches both of their hrefs.
  const bestMatch = navItems
    .filter((item) => pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/")))
    .sort((a, b) => b.href.length - a.href.length)[0]

  return (
    <aside className="w-64 bg-white border-r flex flex-col shrink-0">
      <div className="p-4 border-b">
        <Link href="/dashboard">
          <Image src="/HOPE-logo.png" alt="HOPE" height={36} width={120} className="object-contain" />
        </Link>
        <p className="text-xs text-gray-400 mt-1">{roleLabels[role]}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive = item === bestMatch
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
                item.indent && "ml-4 text-[13px]",
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
      </nav>
    </aside>
  )
}
