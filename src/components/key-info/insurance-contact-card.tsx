import { Shield, Mail, Phone } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { KeyContactDialog } from "./key-contact-dialog"

interface InsuranceContact {
  id: string
  name: string
  role: string | null
  phone: string | null
  email: string | null
}

// Pulled out of the generic multi-category Key Contacts list into its own
// tight card - per Dara, 2026-08-28: an owner looking at Board information
// wants PM contact, Insurance, and banking information at a glance, not
// buried in a longer generic list. Same real data (KeyContact rows with
// category INSURANCE), just surfaced the way PMKeyContactCard/BankInfoCard
// already are.
export function InsuranceContactCard({ contacts, canManage }: { contacts: InsuranceContact[]; canManage: boolean }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4" /> Insurance
        </CardTitle>
        {canManage && (
          <KeyContactDialog
            defaultCategory="INSURANCE"
            trigger={<button className="text-xs text-blue-600 hover:underline">+ Add</button>}
          />
        )}
      </CardHeader>
      <CardContent className="space-y-1.5">
        {contacts.length === 0 && <p className="text-sm text-gray-400">No insurance contact on file yet.</p>}
        {contacts.map((c) => (
          <div key={c.id} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-1.5">
            <p className="text-sm font-medium truncate">
              {c.name}
              {c.role && <span className="text-gray-400 font-normal"> — {c.role}</span>}
            </p>
            <div className="flex gap-3 text-xs text-gray-500 shrink-0">
              {c.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" /> {c.phone}
                </span>
              )}
              {c.email && (
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" /> {c.email}
                </span>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
