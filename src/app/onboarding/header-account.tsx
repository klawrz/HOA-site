"use client"

import { signOut } from "next-auth/react"
import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export function OnboardingHeaderAccount({ name, email }: { name: string | null; email: string }) {
  const initials = name
    ? name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
    : email[0]?.toUpperCase() ?? "?"

  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-2">
        <Avatar className="h-7 w-7">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-right hidden sm:block">
          <p className="text-sm font-medium">{name ?? "User"}</p>
          <p className="text-xs text-gray-500">{email}</p>
        </div>
      </div>
      <Button
        variant="ghost"
        size="sm"
        className="text-red-600 gap-1.5"
        onClick={() => signOut({ callbackUrl: "/login" })}
      >
        <LogOut className="h-4 w-4" /> Sign out
      </Button>
    </div>
  )
}
