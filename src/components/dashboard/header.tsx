"use client"

import { signOut } from "next-auth/react"
import { LogOut, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Role } from "@/generated/prisma"

const roleBadgeColor: Record<Role, string> = {
  OWNER: "bg-blue-100 text-blue-800",
  RENTER: "bg-green-100 text-green-800",
  PROPERTY_MANAGER: "bg-purple-100 text-purple-800",
  CONTRACTOR: "bg-orange-100 text-orange-800",
  BOARD_MEMBER: "bg-red-100 text-red-800",
}

const roleLabel: Record<Role, string> = {
  OWNER: "Owner",
  RENTER: "Renter",
  PROPERTY_MANAGER: "Property Manager",
  CONTRACTOR: "Contractor",
  BOARD_MEMBER: "Board Member",
}

interface HeaderUser {
  id: string
  name?: string | null
  email?: string | null
  role: Role
}

export function DashboardHeader({ user }: { user: HeaderUser }) {
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? "?"

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
      <div />
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${roleBadgeColor[user.role]}`}
        >
          {roleLabel[user.role]}
        </span>
        <Button variant="ghost" size="icon">
          <Bell className="h-4 w-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger render={<Button variant="ghost" className="flex items-center gap-2 h-auto py-1" />}>
            <Avatar className="h-7 w-7">
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div className="text-left hidden md:block">
              <p className="text-sm font-medium">{user.name ?? "User"}</p>
              <p className="text-xs text-gray-500">{user.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600 cursor-pointer"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
