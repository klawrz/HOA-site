import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Image from "next/image"

export default async function OnboardingLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect("/login")
  if (session.user.role !== "ACCOUNT_OWNER") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b px-8 py-4">
        <Image src="/HOPE-logo.png" alt="HOPE" height={40} width={140} className="object-contain" />
      </header>
      <main className="max-w-2xl mx-auto py-12 px-4">{children}</main>
    </div>
  )
}
