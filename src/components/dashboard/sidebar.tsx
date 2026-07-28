"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  Building2, Home, Users, Wrench, FileText,
  TicketIcon, LayoutDashboard, ChevronRight, Mail, Settings, ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/generated/prisma"

type NavItem = { label: string; href: string; icon: React.ElementType }

const navByRole: Record<Role, NavItem[]> = {
  ACCOUNT_OWNER: [
    { label: "Dashboard", href: "/dashboard/account", icon: LayoutDashboard },
    { label: "Units", href: "/dashboard/account/units", icon: Building2 },
    { label: "Members", href: "/dashboard/account/members", icon: Users },
    { label: "Property Manager", href: "/dashboard/account/pm", icon: Wrench },
    { label: "Compliance", href: "/dashboard/account/compliance", icon: ShieldCheck },
  ],
  OWNER: [
    { label: "My Dashboard", href: "/dashboard/owner", icon: LayoutDashboard },
    { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2 },
    { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon },
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
    { label: "Contractors", href: "/dashboard/property-manager/contractors", icon: Wrench },
    { label: "All Tickets", href: "/dashboard/property-manager/tickets", icon: TicketIcon },
    { label: "Company Profile", href: "/dashboard/property-manager/company", icon: Settings },
    { label: "Staff", href: "/dashboard/property-manager/staff", icon: Users },
    { label: "Compliance", href: "/dashboard/property-manager/compliance", icon: ShieldCheck },
  ],
  CONTRACTOR: [
    { label: "Dashboard", href: "/dashboard/contractor", icon: LayoutDashboard },
    { label: "Work Orders", href: "/dashboard/contractor/tickets", icon: TicketIcon },
    { label: "My Contracts", href: "/dashboard/contractor/contracts", icon: FileText },
  ],
  BOARD_MEMBER: [
    { label: "Dashboard", href: "/dashboard/board", icon: LayoutDashboard },
    { label: "Meetings", href: "/dashboard/board/meetings", icon: Users },
    { label: "Documents", href: "/dashboard/board/documents", icon: FileText },
    { label: "Contracts", href: "/dashboard/board/contracts", icon: FileText },
    { label: "Compliance", href: "/dashboard/board/compliance", icon: ShieldCheck },
    { label: "All Tickets", href: "/dashboard/board/tickets", icon: TicketIcon },
  ],
  UNIT_MANAGER: [
    { label: "My Units", href: "/dashboard/unit-manager", icon: LayoutDashboard },
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

export function DashboardSidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const navItems = navByRole[role] ?? []

  return (
    <aside className="w-64 bg-white border-r flex flex-col shrink-0">
      <div className="p-4 border-b">
        <Image src="/HOPE-logo.png" alt="HOPE" height={36} width={120} className="object-contain" />
        <p className="text-xs text-gray-400 mt-1">{roleLabels[role]}</p>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href))
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors",
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
