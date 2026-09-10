import { Building2, ShieldCheck, UserCog, Mail, Phone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

export interface ServiceContact {
  name: string
  role?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
}

function ContactColumn({
  icon,
  heading,
  contact,
  emptyLabel,
}: {
  icon: React.ReactNode
  heading: string
  contact: ServiceContact | null
  emptyLabel: string
}) {
  return (
    <div className="flex-1 min-w-[13rem] border-t sm:border-t-0 sm:border-l first:border-l-0 first:border-t-0 border-gray-100 pt-4 sm:pt-0 sm:pl-4 first:pl-0 first:pt-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {icon}
        {heading}
      </p>
      {contact ? (
        <div className="mt-1.5 space-y-1">
          <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
          {contact.role && <p className="text-xs text-gray-500">{contact.role}</p>}
          {contact.phone && (
            <p className="flex items-center gap-1.5 text-xs text-gray-600">
              <Phone className="h-3 w-3 shrink-0" />
              <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="hover:underline">
                {contact.phone}
              </a>
            </p>
          )}
          {contact.email && (
            <p className="flex items-center gap-1.5 text-xs text-gray-600">
              <Mail className="h-3 w-3 shrink-0" />
              <a href={`mailto:${contact.email}`} className="hover:underline break-all">
                {contact.email}
              </a>
            </p>
          )}
          {contact.note && <p className="text-xs text-gray-400 pt-0.5">{contact.note}</p>}
        </div>
      ) : (
        <p className="mt-1.5 text-sm text-gray-400 italic">{emptyLabel}</p>
      )}
    </div>
  )
}

// Side-by-side "who do I call" panel for an owner: the Property Manager,
// the unit's delegated Unit Manager (or "owner-managed"), and the HOA's
// security contact. Any slot with no record on file shows an explicit
// empty state so the owner always sees the slot exists.
export function ServiceContacts({
  propertyManager,
  unitManager,
  security,
}: {
  propertyManager: ServiceContact | null
  unitManager: ServiceContact | null
  security: ServiceContact | null
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
          <ContactColumn
            icon={<Building2 className="h-3.5 w-3.5" />}
            heading="Property Manager"
            contact={propertyManager}
            emptyLabel="No Property Manager under contract"
          />
          <ContactColumn
            icon={<UserCog className="h-3.5 w-3.5" />}
            heading="Unit Manager"
            contact={unitManager}
            emptyLabel="Owner-managed — no Unit Manager delegated"
          />
          <ContactColumn
            icon={<ShieldCheck className="h-3.5 w-3.5" />}
            heading="Security"
            contact={security}
            emptyLabel="Not on file — the Board or PM can add a Security contact"
          />
        </div>
      </CardContent>
    </Card>
  )
}
