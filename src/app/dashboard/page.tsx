import { auth } from "@/auth"
import { redirect } from "next/navigation"

const roleRedirect: Record<string, string> = {
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
  if (!session) redirect("/login")
  redirect(roleRedirect[session.user.role] ?? "/dashboard/owner")
}
