import { Building2, ShieldCheck, Mail, Phone } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ContactCard, UnitManagerCard } from "@/lib/owner-financial-overview"

export type { ContactCard, UnitManagerCard }

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-gray-600">
      <span className="mt-[1px] shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

function PlainContact({ contact, emptyLabel }: { contact: ContactCard | null; emptyLabel: string }) {
  if (!contact) return <p className="text-sm text-gray-400 italic">{emptyLabel}</p>
  return (
    <>
      <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
      {contact.role && <p className="text-xs text-gray-500">{contact.role}</p>}
      {contact.phone && (
        <Line icon={<Phone className="h-3 w-3" />}>
          <a href={`tel:${contact.phone.replace(/\s+/g, "")}`} className="hover:underline">
            {contact.phone}
          </a>
        </Line>
      )}
      {contact.email && (
        <Line icon={<Mail className="h-3 w-3" />}>
          <a href={`mailto:${contact.email}`} className="hover:underline">
            {contact.email}
          </a>
        </Line>
      )}
      {contact.note && <p className="text-xs text-gray-400 pt-0.5">{contact.note}</p>}
    </>
  )
}

// Org-level "who to pay / who to call" pair for an owner: the Property
// Manager and the HOA security contact. (The unit-level Unit Manager and
// cleaner live in the per-unit details block instead.)
export function ServiceContacts({
  propertyManager,
  security,
}: {
  propertyManager: ContactCard | null
  security: ContactCard | null
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
          <div className="flex-1 min-w-[13rem]">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <Building2 className="h-3.5 w-3.5" />
              Property Manager
            </p>
            <div className="mt-1.5 space-y-1">
              <PlainContact contact={propertyManager} emptyLabel="No Property Manager under contract" />
            </div>
          </div>
          <div className="flex-1 min-w-[13rem] border-t sm:border-t-0 sm:border-l border-gray-100 pt-4 sm:pt-0 sm:pl-4">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
              <ShieldCheck className="h-3.5 w-3.5" />
              Security
            </p>
            <div className="mt-1.5 space-y-1">
              <PlainContact
                contact={security}
                emptyLabel="Not on file — the Board or PM can add a Security contact"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
