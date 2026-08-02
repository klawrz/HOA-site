import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { SignOutButton } from "./sign-out-button"

// A deliberately small, standalone chrome - platform admin is orthogonal to
// every org's Role/sidebar, so it doesn't reuse DashboardSidebar/Header.
export default async function PlatformAdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user.isPlatformAdmin) redirect("/login")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-6 py-3 flex items-center justify-between">
        <Link href="/platform-admin" className="font-semibold text-gray-900">
          HOPE Platform Admin
        </Link>
        <SignOutButton />
      </header>
      <main className="max-w-4xl mx-auto p-6">{children}</main>
    </div>
  )
}
