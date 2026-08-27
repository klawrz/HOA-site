"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { signOut, useSession } from "next-auth/react"
import { LogOut, Bell, KeyRound, Building2, Shield, Plus } from "lucide-react"
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
import { AddOrgDialog } from "@/components/dashboard/add-org-dialog"
import { AskHopePanel } from "@/components/ask-hope/ask-hope-panel"
import { Role } from "@/generated/prisma"
import { ROLE_HOME, roleForPathname } from "@/lib/role-access"
import { Eye } from "lucide-react"

// Every role an Account Owner can preview - see canPreviewRole in
// src/lib/role-access.ts. ACCOUNT_OWNER itself is left out since that's
// already where they are.
const PREVIEWABLE_ROLES: Role[] = ["OWNER", "BOARD_MEMBER", "PROPERTY_MANAGER", "CONTRACTOR", "UNIT_MANAGER", "RENTER"]

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
  ACCOUNT_OWNER: "Account Holder",
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
  isBoardMember,
}: {
  user: HeaderUser
  orgName: string
  isPlatformAdmin: boolean
  otherOrgs: OtherOrg[]
  isBoardMember?: boolean
}) {
  const router = useRouter()
  const pathname = usePathname()
  const previewRole = roleForPathname(pathname, user.role)
  const isPreviewing = previewRole !== user.role
  const { update } = useSession()
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)
  const [addOrgOpen, setAddOrgOpen] = useState(false)
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
          className={`text-xs font-medium px-2 py-1 rounded-full ${roleBadgeColor[previewRole]}`}
        >
          {roleLabel[previewRole]}
        </span>
        {isPreviewing && (
          <Link
            href={ROLE_HOME[user.role]}
            className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            Exit preview
          </Link>
        )}
        {/* isBoardMember is a capacity layered on top of the primary role
            (see schema.prisma), not a second account - single signin, per
            Dara 2026-08-27 - so it gets its own clickable pill straight to
            the shared Board section rather than requiring a role switch.
            Hidden while already previewing as Board Member - redundant. */}
        {isBoardMember && previewRole !== "BOARD_MEMBER" && (
          <Link
            href="/dashboard/board"
            className={`text-xs font-medium px-2 py-1 rounded-full transition-opacity hover:opacity-80 ${roleBadgeColor.BOARD_MEMBER}`}
          >
            {roleLabel.BOARD_MEMBER}
          </Link>
        )}
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
            {/* Navigation/preview only (see canPreviewRole) - the Account
                Owner can look at any role's screens automatically, per
                Dara 2026-08-27, but this menu is the actual way to GET
                there; the page-level permission fix alone had no visible
                entry point, which is exactly what was missing at first. */}
            {user.role === "ACCOUNT_OWNER" && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Eye className="h-4 w-4 mr-2" />
                  View as...
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {PREVIEWABLE_ROLES.map((role) => (
                    <DropdownMenuItem
                      key={role}
                      className="cursor-pointer"
                      onClick={() => router.push(ROLE_HOME[role])}
                    >
                      {roleLabel[role]}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}
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
            {user.role === "ACCOUNT_OWNER" && (
              <DropdownMenuItem className="cursor-pointer" onClick={() => setAddOrgOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add another organization
              </DropdownMenuItem>
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
      <AddOrgDialog open={addOrgOpen} onOpenChange={setAddOrgOpen} />
    </header>
  )
}
