import Link from "next/link"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Building2, Users, FileText, Wrench, Shield } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const roles = [
  {
    icon: Building2,
    title: "Owners",
    desc: "Manage your unit, set rental availability and policy, track maintenance requests.",
    color: "bg-blue-50 text-blue-700",
  },
  {
    icon: Users,
    title: "Renters",
    desc: "View your unit details, submit trouble tickets, and stay informed on HOA notices.",
    color: "bg-green-50 text-green-700",
  },
  {
    icon: Shield,
    title: "Property Manager",
    desc: "Full unit availability board, owner & contractor directories, and ticket management.",
    color: "bg-purple-50 text-purple-700",
  },
  {
    icon: Wrench,
    title: "Contractors",
    desc: "View and update assigned work orders, access your HOA contracts.",
    color: "bg-orange-50 text-orange-700",
  },
  {
    icon: FileText,
    title: "Board of Directors",
    desc: "Meeting management, document library, contracts, and institutional memory.",
    color: "bg-red-50 text-red-700",
  },
]

export default async function HomePage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white border-b px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="h-6 w-6 text-blue-600" />
          <span className="font-semibold text-lg">Sunrise HOA Portal</span>
        </div>
        <div className="flex gap-3">
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
            Sign In
          </Link>
          <Link href="/register" className={cn(buttonVariants())}>
            Register
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="bg-gradient-to-br from-blue-600 to-blue-800 text-white py-20 px-6 text-center">
          <h1 className="text-4xl font-bold mb-4">Welcome to Sunrise HOA</h1>
          <p className="text-xl text-blue-100 max-w-2xl mx-auto mb-8">
            A unified portal for owners, renters, property managers, contractors,
            and board members to manage community life.
          </p>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
          >
            Sign In to Your Portal
          </Link>
        </section>

        <section className="max-w-5xl mx-auto py-16 px-6">
          <h2 className="text-2xl font-bold text-center mb-10 text-gray-800">
            Built for Every Role in Your Community
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {roles.map((r) => (
              <div
                key={r.title}
                className="bg-white rounded-xl border p-6 shadow-sm"
              >
                <div className={`inline-flex p-3 rounded-lg ${r.color} mb-4`}>
                  <r.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{r.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{r.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gray-50 border-t py-12 px-6 text-center">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">
            Solving the key pain point
          </h3>
          <p className="text-gray-500 max-w-xl mx-auto">
            Never wonder again which units are available to rent — or whether an
            owner accepts all applicants or only friends and family. Our
            availability board makes it instantly clear.
          </p>
        </section>
      </main>
    </div>
  )
}
