import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { ROLE_HOME } from "@/lib/role-access"

export default async function DashboardIndexPage() {
  const session = await auth()
  redirect(session?.user.role ? ROLE_HOME[session.user.role] : "/login")
}
