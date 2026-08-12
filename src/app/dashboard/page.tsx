import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Role } from "@/generated/prisma"

const ROLE_HOME: Record<Role, string> = {
  ACCOUNT_OWNER: "/dashboard/account",
  OWNER: "/dashboard/owner",
  RENTER: "/dashboard/renter",
  PROPERTY_MANAGER: "/dashboard/property-manager",
  CONTRACTOR: "/dashboard/contractor",
  BOARD_MEMBER: "/dashboard/board",
  UNIT_MANAGER: "/dashboard/unit-manager",
}

export default async function DashboardIndexPage() {
  const session = await auth()
  redirect(session?.user.role ? ROLE_HOME[session.user.role] : "/login")
}
