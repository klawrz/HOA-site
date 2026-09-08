import Link from "next/link"
import { Wrench, Mail, Phone, TicketIcon, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SetupStatus, setupStatusMessage } from "@/lib/setup-status"

interface Company {
  legalName: string
  email: string | null
  phone: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  primaryContactPhone: string | null
  emergencyContacts?: { name: string; phone: string }[]
}

// Read-only summary for Key Information, pulled from the active PMContract's
// company - full contract terms/history stay on the dedicated PM page, this
// is just "who to call." When there's no active PM, `status` (from
// getPMSetupStatus) explains which step is actually missing and who can
// act next, instead of a flat "no PM on file" that looked the same whether
// nobody had signed up yet or a contract was one Board approval away.
//
// `highlighted` (added 2026-08-28, per Dara: "put the PM highlighted as
// they are playing a key role") gives the card an amber accent - used on
// the Owner's Governance page, right under Board Members, since that's
// the one place an owner needs the PM to stand out; Board's/PM's own
// Key Information pages keep the plain look.
//
// `ticketsHref` (added 2026-08-28, per Dara: "a link to create a ticket
// for most things. Then an 'in the event of emergency' contact") - splits
// routine vs. urgent right here: a ticket link for most things, and a real
// `PMEmergencyContact` (src/app/actions/pm.ts - the PM's own staff manage
// these) called out explicitly for emergencies. Falls back to the
// company's own phone only if no dedicated emergency contact is on file.
// Optional since Board's/PM's own Key Information pages don't need
// "submit a ticket to yourself."
export function PMKeyContactCard({
  company,
  status,
  highlighted,
  ticketsHref,
}: {
  company: Company | null
  status?: SetupStatus
  highlighted?: boolean
  ticketsHref?: string
}) {
  return (
    <Card className={highlighted ? "ring-2 ring-amber-300 bg-amber-50/40" : undefined}>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Wrench className={`h-4 w-4 ${highlighted ? "text-amber-600" : ""}`} /> Property Management
          {highlighted && (
            <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full">
              Key Contact
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        {!company && (
          <p className="text-gray-400">
            {status && status.state !== "done" ? setupStatusMessage(status) : "No active Property Manager on file."}
          </p>
        )}
        {company && (
          <div className="space-y-1">
            {/* Flattened from a 5-6 line vertical stack into two rows, per
                Dara ("less vertical") - company + its contact on one line,
                the named primary contact + theirs on the next. */}
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
              <p className="font-medium">{company.legalName}</p>
              <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                {company.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {company.phone}
                  </span>
                )}
                {company.email && (
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" /> {company.email}
                  </span>
                )}
              </div>
            </div>
            {(company.primaryContactName || company.primaryContactEmail || company.primaryContactPhone) && (
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                <p className="text-gray-500">
                  {company.primaryContactName && (
                    <>
                      <span className="text-gray-400">Primary Contact</span> {company.primaryContactName}
                    </>
                  )}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {company.primaryContactPhone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-3 w-3" /> {company.primaryContactPhone}
                    </span>
                  )}
                  {company.primaryContactEmail && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-3 w-3" /> {company.primaryContactEmail}
                    </span>
                  )}
                </div>
              </div>
            )}
            {ticketsHref && (() => {
              const emergency = company.emergencyContacts?.[0]
              const emergencyPhone = emergency?.phone ?? company.phone ?? company.primaryContactPhone
              if (!emergencyPhone) return null
              return (
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-t pt-2 mt-1">
                  <Link
                    href={ticketsHref}
                    className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline"
                  >
                    <TicketIcon className="h-3.5 w-3.5" /> For most things, submit a ticket
                  </Link>
                  <span className="flex items-center gap-1.5 text-xs font-medium text-red-600">
                    <AlertTriangle className="h-3.5 w-3.5" /> In an emergency, call {emergencyPhone}
                    {emergency && ` (${emergency.name})`}
                  </span>
                </div>
              )
            })()}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
