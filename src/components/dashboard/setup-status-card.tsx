import { CheckCircle2, Circle, Clock, AlertCircle } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { SetupStatus, setupStatusMessage } from "@/lib/setup-status"

const roleLabel: Record<string, string> = {
  ACCOUNT_OWNER: "Account Owner",
  BOARD_MEMBER: "Board Member",
  PROPERTY_MANAGER: "Property Manager",
  OWNER: "Owner",
}

function actorText(actor: string[]) {
  return actor.map((a) => roleLabel[a] ?? a).join(" or ")
}

export function SetupStatusCard({ title, status }: { title: string; status: SetupStatus }) {
  const icon =
    status.state === "done" ? (
      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
    ) : status.state === "pending" ? (
      <Clock className="h-5 w-5 text-amber-500 shrink-0" />
    ) : status.state === "blocked" ? (
      <AlertCircle className="h-5 w-5 text-red-500 shrink-0" />
    ) : (
      <Circle className="h-5 w-5 text-gray-300 shrink-0" />
    )

  return (
    <Card>
      <CardContent className="py-4 px-4 flex items-start gap-3">
        {icon}
        <div className="min-w-0">
          <p className="font-medium text-sm">{title}</p>
          {status.state === "done" ? (
            <p className="text-xs text-gray-500 mt-0.5">{status.detail ?? "Complete"}</p>
          ) : (
            <>
              <p className="text-xs text-gray-500 mt-0.5">{setupStatusMessage(status)}</p>
              <p className="text-[11px] text-gray-400 mt-1">Next: {actorText(status.actor)}</p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
