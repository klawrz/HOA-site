"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, Bell, KeyRound, Building2, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ChangePasswordDialog } from "@/components/dashboard/change-password-dialog"
import { AskHopePanel } from "@/components/ask-hope/ask-hope-panel"
import { Role } from "@/generated/prisma"

const roleBadgeColor: Record<Role, string> = {
  ACCOUNT_OWNER: "bg-gray-100 text-gray-800",
  OWNER: "bg-blue-100 text-blue-800",
  RENTER: "bg-green-100 text-green-800",
  PROPERTY_MANAGER: "bg-purple-100 text-purple-800",
  CONTRACTOR: "bg-orange-100 text-orange-800",
  BOARD_MEMBER: "bg-red-100 text-red-800",
  UNIT_MANAGER: "bg-teal-100 text-teal-800",
}

const roleLabel: Record<Role, string> = {
  ACCOUNT_OWNER: "Account Owner",
  OWNER: "Owner",
  RENTER: "Renter",
  PROPERTY_MANAGER: "Property Manager",
  CONTRACTOR: "Contractor",
  BOARD_MEMBER: "Board Member",
  UNIT_MANAGER: "Unit Manager",
}

interface HeaderUser {
  id: string
  name?: string | null
  email?: string | null
  role: Role
}

type OtherOrg = { orgId: string; orgName: string; role: Role }

export function DashboardHeader({
  user,
  orgName,
  isPlatformAdmin,
  otherOrgs,
}: {
  user: HeaderUser
  orgName: string
  isPlatformAdmin: boolean
  otherOrgs: OtherOrg[]
}) {
  const router = useRouter()
  const { update } = useSession()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [switching, setSwitching] = useState(false)
  const initials = user.name
    ? user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : user.email?.[0].toUpperCase() ?? "?"

  async function switchOrg(orgId: string) {
    setSwitching(true)
    await update({ orgId })
    router.refresh()
    setSwitching(false)
  }

  return (
    <header className="bg-white border-b px-6 py-3 flex items-center justify-between print:hidden">
      <div />
      <div className="flex items-center gap-3">
        <span
          className={`text-xs font-medium px-2 py-1 rounded-full ${roleBadgeColor[user.role]}`}
        >
          {roleLabel[user.role]}
        </span>
        <AskHopePanel role={user.role} userName={user.name} />
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
              <p className="text-xs text-gray-500">{orgName || user.email}</p>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuGroup>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuItem className="cursor-pointer" onClick={() => setChangePasswordOpen(true)}>
              <KeyRound className="h-4 w-4 mr-2" />
              Change password
            </DropdownMenuItem>
            {otherOrgs.length > 0 && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Building2 className="h-4 w-4 mr-2" />
                  Switch organization
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {otherOrgs.map((org) => (
                    <DropdownMenuItem
                      key={org.orgId}
                      className="cursor-pointer"
                      disabled={switching}
                      onClick={() => switchOrg(org.orgId)}
                    >
                      <div>
                        <p>{org.orgName}</p>
                        <p className="text-xs text-gray-400">{roleLabel[org.role]}</p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
            {isPlatformAdmin && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => router.push("/platform-admin")}>
                <Shield className="h-4 w-4 mr-2" />
                Platform Admin
              </DropdownMenuItem>
            )}
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
      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </header>
  )
}
