"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Building2,
  Home,
  Users,
  Wrench,
  FileText,
  TicketIcon,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Role } from "@/generated/prisma"

type NavItem = {
  label: string
  href: string
  icon: React.ElementType
}

const navByRole: Record<Role, NavItem[]> = {
  OWNER: [
    { label: "My Dashboard", href: "/dashboard/owner", icon: LayoutDashboard },
    { label: "My Unit", href: "/dashboard/owner/unit", icon: Home },
    { label: "Rental Settings", href: "/dashboard/owner/rental", icon: Building2 },
    { label: "Trouble Tickets", href: "/dashboard/owner/tickets", icon: TicketIcon },
  ],
  RENTER: [
    { label: "My Dashboard", href: "/dashboard/renter", icon: LayoutDashboard },
    { label: "My Unit", href: "/dashboard/renter/unit", icon: Home },
    { label: "Submit Ticket", href: "/dashboard/renter/tickets/new", icon: TicketIcon },
    { label: "My Tickets", href: "/dashboard/renter/tickets", icon: FileText },
  ],
  PROPERTY_MANAGER: [
    { label: "Dashboard", href: "/dashboard/property-manager", icon: LayoutDashboard },
    { label: "Unit Availability", href: "/dashboard/property-manager/units", icon: Building2 },
    { label: "Owner Directory", href: "/dashboard/property-manager/owners", icon: Users },
    { label: "Contractors", href: "/dashboard/property-manager/contractors", icon: Wrench },
    { label: "All Tickets", href: "/dashboard/property-manager/tickets", icon: TicketIcon },
  ],
  CONTRACTOR: [
    { label: "Dashboard", href: "/dashboard/contractor", icon: LayoutDashboard },
    { label: "My Work Orders", href: "/dashboard/contractor/tickets", icon: TicketIcon },
    { label: "My Contracts", href: "/dashboard/contractor/contracts", icon: FileText },
  ],
  BOARD_MEMBER: [
    { label: "Dashboard", href: "/dashboard/board", icon: LayoutDashboard },
    { label: "Meetings", href: "/dashboard/board/meetings", icon: Users },
    { label: "Documents", href: "/dashboard/board/documents", icon: FileText },
    { label: "Contracts", href: "/dashboard/board/contracts", icon: FileText },
    { label: "Community", href: "/dashboard/board/community", icon: Building2 },
  ],
}

const roleLabels: Record<Role, string> = {
  OWNER: "Owner Portal",
  RENTER: "Renter Portal",
  PROPERTY_MANAGER: "Manager Portal",
  CONTRACTOR: "Contractor Portal",
  BOARD_MEMBER: "Board Portal",
}

export function DashboardSidebar({ role }: { role: Role }) {
  const pathname = usePathname()
  const navItems = navByRole[role] ?? []

  return (
    <aside className="w-64 bg-white border-r flex flex-col shrink-0">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-blue-600" />
          <div>
            <p className="font-semibold text-sm">Sunrise HOA</p>
            <p className="text-xs text-gray-500">{roleLabels[role]}</p>
          </div>
        </div>
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
                  ? "bg-blue-50 text-blue-700 font-medium"
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

      <div className="p-3 border-t text-xs text-gray-400 text-center">
        Sunrise HOA © 2025
      </div>
    </aside>
  )
}
