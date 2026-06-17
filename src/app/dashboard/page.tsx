import { auth } from "@/auth"
import { redirect } from "next/navigation"

const roleRedirect = {
  OWNER: "/dashboard/owner",
  RENTER: "/dashboard/renter",
  PROPERTY_MANAGER: "/dashboard/property-manager",
  CONTRACTOR: "/dashboard/contractor",
  BOARD_MEMBER: "/dashboard/board",
}

export default async function DashboardIndexPage() {
  const session = await auth()
  if (!session) redirect("/login")

  const dest = roleRedirect[session.user.role] ?? "/dashboard/owner"
  redirect(dest)
}
