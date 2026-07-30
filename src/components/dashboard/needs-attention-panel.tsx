import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, CheckCircle2 } from "lucide-react"
import { AttentionItem, attentionSeverityLabel } from "@/lib/attention"

const severityColor: Record<string, string> = {
  expired: "bg-red-100 text-red-800",
  overdue: "bg-red-100 text-red-800",
  over_budget: "bg-amber-100 text-amber-800",
  expiring: "bg-amber-100 text-amber-800",
}

export function NeedsAttentionPanel({ items }: { items: AttentionItem[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" /> Needs Attention
        </CardTitle>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-sm text-gray-500 flex items-center gap-2 py-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" /> Nothing needs attention right now.
          </p>
        ) : (
          <div className="space-y-2">
            {items.map((item, i) => (
              <Link
                key={i}
                href={item.href}
                className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{item.title}</p>
                  <p className="text-xs text-gray-500">{item.detail}</p>
                </div>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ml-3 ${severityColor[item.severity]}`}
                >
                  {attentionSeverityLabel[item.severity]}
                </span>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
