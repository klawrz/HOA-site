import { Building2, ShieldCheck, UserCog, Mail, Phone, KeyRound, TicketCheck } from "lucide-react"
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

function Column({
  icon,
  heading,
  children,
}: {
  icon: React.ReactNode
  heading: string
  children: React.ReactNode
}) {
  return (
    <div className="flex-1 min-w-[13rem] border-t sm:border-t-0 sm:border-l first:border-l-0 first:border-t-0 border-gray-100 pt-4 sm:pt-0 sm:pl-4 first:pl-0 first:pt-0">
      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
        {icon}
        {heading}
      </p>
      <div className="mt-1.5 space-y-1">{children}</div>
    </div>
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

function UnitManagerContent({ um }: { um: UnitManagerCard | null }) {
  if (!um) return <p className="text-sm text-gray-400 italic">No unit on file</p>

  const delegated = um.areas.length > 0 || um.phone || um.email || um.notes
  return (
    <>
      <p className="text-sm font-semibold text-gray-900">{um.name}</p>
      <p className="text-xs text-gray-500">
        {um.assignedBy}
        {um.unitName ? ` · ${um.unitName}` : ""}
      </p>
      {um.phone && (
        <Line icon={<Phone className="h-3 w-3" />}>
          <a href={`tel:${um.phone.replace(/\s+/g, "")}`} className="hover:underline">
            {um.phone}
          </a>
        </Line>
      )}
      {um.email && (
        <Line icon={<Mail className="h-3 w-3" />}>
          <a href={`mailto:${um.email}`} className="hover:underline">
            {um.email}
          </a>
        </Line>
      )}
      {um.accessCode && (
        <Line icon={<KeyRound className="h-3 w-3" />}>
          Access code: <span className="font-mono text-gray-800">{um.accessCode}</span>
          {um.accessCodeNotes ? ` — ${um.accessCodeNotes}` : ""}
        </Line>
      )}
      {um.areas.length > 0 && (
        <p className="flex flex-wrap gap-1 pt-0.5">
          {um.areas.map((a) => (
            <span
              key={a.label}
              className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium"
            >
              {a.label}: {a.level === "MANAGE" ? "manage" : "view"}
            </span>
          ))}
        </p>
      )}
      {um.canCreateTickets && (
        <Line icon={<TicketCheck className="h-3 w-3 text-teal-600" />}>
          Can create &amp; manage tickets for this unit
        </Line>
      )}
      {um.notes && <p className="text-xs text-gray-400 pt-0.5">{um.notes}</p>}
      {!delegated && (
        <p className="text-xs text-gray-400 pt-0.5">
          Assign a Unit Manager (contact, access code, ticket rights) from the unit&apos;s page.
        </p>
      )}
    </>
  )
}

// Side-by-side "who do I call" panel for an owner: the Property Manager,
// the owner-delegated Unit Manager (contact, access code, granted areas,
// ticket rights), and the HOA's security contact. Slots with nothing on
// file show an explicit empty state.
export function ServiceContacts({
  propertyManager,
  unitManager,
  security,
}: {
  propertyManager: ContactCard | null
  unitManager: UnitManagerCard | null
  security: ContactCard | null
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex flex-col sm:flex-row gap-4 sm:gap-0">
          <Column icon={<Building2 className="h-3.5 w-3.5" />} heading="Property Manager">
            <PlainContact contact={propertyManager} emptyLabel="No Property Manager under contract" />
          </Column>
          <Column icon={<UserCog className="h-3.5 w-3.5" />} heading="Unit Manager">
            <UnitManagerContent um={unitManager} />
          </Column>
          <Column icon={<ShieldCheck className="h-3.5 w-3.5" />} heading="Security">
            <PlainContact
              contact={security}
              emptyLabel="Not on file — the Board or PM can add a Security contact"
            />
          </Column>
        </div>
      </CardContent>
    </Card>
  )
}
