import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { FileBarChart } from "lucide-react"

type BudgetRow = {
  id: string
  year: number
  version: string
  status: string
  lineItemCount: number
  totalBudgeted: number
}

export function BudgetList({ budgets, detailBasePath }: { budgets: BudgetRow[]; detailBasePath: string }) {
  if (budgets.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <FileBarChart className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          No budgets yet. Create the first one.
        </CardContent>
      </Card>
    )
  }

  const sorted = [...budgets].sort((a, b) => b.year - a.year)

  return (
    <div className="space-y-2">
      {sorted.map((b) => (
        <Link key={b.id} href={`${detailBasePath}/${b.id}`}>
          <Card className="hover:border-gray-300 transition-colors">
            <CardContent className="py-3 px-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">
                    {b.year} — {b.version}
                  </p>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                      b.status === "APPROVED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {b.status === "APPROVED" ? "Approved" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  {b.lineItemCount} line item{b.lineItemCount !== 1 ? "s" : ""}
                </p>
              </div>
              <p className="text-sm font-semibold">${b.totalBudgeted.toLocaleString()}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
