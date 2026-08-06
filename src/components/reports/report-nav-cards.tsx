import Link from "next/link"
import { DollarSign, ClipboardList, DatabaseBackup, ChevronRight } from "lucide-react"

export function ReportNavCards({ basePath }: { basePath: string }) {
  const cards = [
    {
      href: `${basePath}/financial`,
      icon: DollarSign,
      color: "text-green-600",
      title: "Financial Report",
      desc: "Reserve fund, budgets, and dues & assessments - a complete financial status.",
    },
    {
      href: `${basePath}/operations`,
      icon: ClipboardList,
      color: "text-blue-600",
      title: "Operations Report",
      desc: "Contracts, trouble tickets, meetings, and compliance document status.",
    },
    {
      href: `${basePath}/data-export`,
      icon: DatabaseBackup,
      color: "text-purple-600",
      title: "Full Data Export",
      desc: "Download everything HOPE holds for this HOA as a single file.",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((c) => (
        <Link
          key={c.href}
          href={c.href}
          className="bg-white border rounded-xl p-5 hover:border-gray-300 transition-colors group"
        >
          <c.icon className={`h-5 w-5 mb-3 ${c.color}`} />
          <p className="font-medium flex items-center justify-between">
            {c.title}
            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-gray-600" />
          </p>
          <p className="text-sm text-gray-500 mt-1">{c.desc}</p>
        </Link>
      ))}
    </div>
  )
}
