import { UserCog, Mail, Phone, ShieldAlert } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type Contact = {
  name: string | null
  title?: string | null
  email: string | null
  phone: string | null
}

// Read-only, sourced from what the platform admin captured when this org
// was set up (see platform-admin's Billing & Account card) - the same
// business-continuity info from account creation, now surfaced to whoever
// they're onboarding into governance roles rather than staying admin-only.
export function AccountOwnerCard({
  accountOwner,
  altContact,
}: {
  accountOwner: Contact
  altContact: Contact
}) {
  const hasOwnerInfo = accountOwner.name || accountOwner.email || accountOwner.phone
  const hasAltInfo = altContact.name || altContact.email || altContact.phone

  if (!hasOwnerInfo && !hasAltInfo) return null

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <UserCog className="h-4 w-4" /> Account Owner & Emergency Contact
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hasOwnerInfo && (
          <div className="bg-gray-50 rounded-lg px-3 py-2">
            <p className="text-sm font-medium">
              {accountOwner.name ?? "Unnamed"}
              {accountOwner.title && <span className="text-gray-400 font-normal"> — {accountOwner.title}</span>}
            </p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
              {accountOwner.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {accountOwner.email}
                </span>
              )}
              {accountOwner.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {accountOwner.phone}
                </span>
              )}
            </div>
          </div>
        )}
        {hasAltInfo && (
          <div className="bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            <p className="text-xs font-semibold text-amber-800 flex items-center gap-1.5 mb-1">
              <ShieldAlert className="h-3.5 w-3.5" /> Alternate Contact
            </p>
            <p className="text-sm font-medium">{altContact.name ?? "Unnamed"}</p>
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
              {altContact.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {altContact.email}
                </span>
              )}
              {altContact.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {altContact.phone}
                </span>
              )}
            </div>
          </div>
        )}
        {!hasAltInfo && (
          <p className="text-xs text-gray-400">
            No alternate contact on file yet - worth having in case the Account Owner is unreachable.
          </p>
        )}
      </CardContent>
    </Card>
  )
}
