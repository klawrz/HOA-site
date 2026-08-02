"use client"

import { useState } from "react"
import Link from "next/link"
import { Search, Users } from "lucide-react"
import { Input } from "@/components/ui/input"

const roleLabels: Record<string, string> = {
  ACCOUNT_OWNER: "Account Owner",
  OWNER: "Unit Owner",
  RENTER: "Renter",
  PROPERTY_MANAGER: "Property Manager",
  CONTRACTOR: "Contractor",
  BOARD_MEMBER: "Board Member",
  UNIT_MANAGER: "Unit Manager",
}

const roleColors: Record<string, string> = {
  ACCOUNT_OWNER: "bg-gray-900 text-white",
  OWNER: "bg-blue-100 text-blue-700",
  RENTER: "bg-green-100 text-green-700",
  PROPERTY_MANAGER: "bg-purple-100 text-purple-700",
  CONTRACTOR: "bg-orange-100 text-orange-700",
  BOARD_MEMBER: "bg-red-100 text-red-700",
  UNIT_MANAGER: "bg-teal-100 text-teal-700",
}

type Member = {
  id: string
  name: string | null
  email: string
  role: string
  units: string[]
}

export function MembersList({ members, unitLabel }: { members: Member[]; unitLabel: string }) {
  const [query, setQuery] = useState("")

  const filtered = members.filter((m) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return (m.name ?? "").toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
  })

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="pl-9"
        />
      </div>

      <div className="bg-white border rounded-xl divide-y">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>{members.length === 0 ? "No members yet" : "No members match your search"}</p>
          </div>
        )}
        {filtered.map((m) => (
          <Link
            key={m.id}
            href={`/dashboard/account/members/${m.id}`}
            className="flex items-center justify-between px-4 py-2 hover:bg-gray-50 transition-colors"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">{m.name ?? m.email}</p>
              <p className="text-xs text-gray-400 truncate">
                {m.email}
                {m.units.length > 0 && ` · ${unitLabel} ${m.units.join(", ")}`}
              </p>
            </div>
            <span
              className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${roleColors[m.role] ?? "bg-gray-100 text-gray-600"}`}
            >
              {roleLabels[m.role] ?? m.role}
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
