import Link from "next/link"
import Image from "next/image"
import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { Building2, Users, FileText, Wrench, Shield } from "lucide-react"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const roles = [
  {
    icon: Building2,
    title: "Owners",
    desc: "Track your dues and costs, manage your unit, and submit maintenance requests.",
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
    desc: "Oversee HOA finances and reserve funds, owner & contractor directories, and ticket management.",
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
    desc: "Oversee HOA finances and reserve funds, meeting management, and document library.",
    color: "bg-red-50 text-red-700",
  },
]

export default async function HomePage() {
  const session = await auth()
  if (session) redirect("/dashboard")

  return (
    <div className="min-h-full flex flex-col">
      <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 px-8 py-4 flex items-center justify-between sticky top-0 z-50">
        <Image
          src="/HOPE-logo.png"
          alt="HOPE"
          height={56}
          width={200}
          className="object-contain"
        />
        <Link
          href="/login"
          className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors px-4 py-2 rounded-full hover:bg-gray-100"
        >
          Sign In
        </Link>
      </header>

      <main className="flex-1">
        <section className="relative h-[500px] flex items-center justify-center text-white text-center">
          <Image
            src="/sampaguita-hero.png"
            alt="HOA community"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-black/50" />
          <div className="relative z-10 px-6 max-w-3xl mx-auto">
            <h1 className="text-4xl font-bold mb-3">Run your property. Easier.</h1>
            <p className="text-xl text-gray-100 mb-6">The operating system for modern properties.</p>
            <p className="text-base text-gray-200 max-w-2xl mx-auto mb-8">
              Connect people, finances, assets, documents, maintenance, and governance in one
              intelligent system that helps your organization spend less time administering and
              more time making good decisions.
            </p>
            <Link
              href="/login"
              className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
            >
              Sign In to Your Portal
            </Link>
          </div>
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
            Never lose track of where the budget stands. See budgeted vs. actual spend,
            monitor reserve fund health in real time, and give your Board the numbers
            they need before every meeting — not after.
          </p>
        </section>

        <section className="border-t py-12 px-6 text-center">
          <h3 className="text-lg font-semibold mb-2 text-gray-700">
            Digital-first, and not alone in it
          </h3>
          <p className="text-gray-500 max-w-xl mx-auto">
            Governments are moving services online by default — Mexico has adopted a formal
            national strategy through 2030 built around digital identity, connected systems, and
            digital-first delivery as the standard. A community that runs on HOPE isn&apos;t
            ahead of its time. It&apos;s exactly on time.
          </p>
        </section>
      </main>
    </div>
  )
}
