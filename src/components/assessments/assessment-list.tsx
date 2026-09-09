import Link from "next/link"
import { Card, CardContent } from "@/components/ui/card"
import { Receipt } from "lucide-react"
import { Currency } from "@/generated/prisma"
import { convertToSecondary, secondaryCurrency, formatMoney } from "@/lib/currency"

type AssessmentRow = {
  id: string
  title: string
  type: string
  status: string
  totalAmount: number
  totalCollected: number
  dueDate: Date
}

const typeLabel: Record<string, string> = {
  REGULAR_DUES: "Regular Dues",
  SPECIAL: "Special Assessment",
}

export function AssessmentList({
  assessments,
  detailBasePath,
  currency = "USD",
  exchangeRate = null,
}: {
  assessments: AssessmentRow[]
  detailBasePath: string
  currency?: Currency
  exchangeRate?: number | null
}) {
  if (assessments.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-gray-500">
          <Receipt className="h-10 w-10 mx-auto mb-3 text-gray-300" />
          No assessments yet. Create the first one.
        </CardContent>
      </Card>
    )
  }

  const secondary = secondaryCurrency(currency)
  const money = (n: number) => formatMoney(n, currency)
  const approx = (n: number) =>
    exchangeRate != null ? ` ≈ ${formatMoney(convertToSecondary(n, exchangeRate, currency), secondary)}` : ""

  const sorted = [...assessments].sort((a, b) => b.dueDate.getTime() - a.dueDate.getTime())

  return (
    <div className="space-y-2">
      {sorted.map((a) => (
        <Link key={a.id} href={`${detailBasePath}/${a.id}`}>
          <Card className="hover:border-gray-300 transition-colors">
            <CardContent className="py-3 px-4 flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm">{a.title}</p>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-full font-medium bg-gray-100 text-gray-700">
                    {typeLabel[a.type] ?? a.type}
                  </span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-full font-medium ${
                      a.status === "ISSUED" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {a.status === "ISSUED" ? "Issued" : "Draft"}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-0.5">
                  Due {a.dueDate.toISOString().slice(0, 10)}
                  {a.status === "ISSUED" &&
                    ` · ${money(a.totalCollected)} of ${money(a.totalAmount)} collected`}
                </p>
              </div>
              <p className="text-sm font-semibold tabular-nums text-right">
                {money(a.totalAmount)}
                {exchangeRate != null && (
                  <span className="block text-xs font-normal text-gray-400">{approx(a.totalAmount).trim()}</span>
                )}
              </p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  )
}
