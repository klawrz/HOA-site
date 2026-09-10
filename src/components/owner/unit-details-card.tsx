import Link from "next/link"
import {
  ChevronRight,
  KeyRound,
  Mail,
  Phone,
  UserCog,
  Sparkles,
  TicketCheck,
} from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import type { ContactCard, UnitManagerCard } from "@/lib/owner-financial-overview"

function iso(d: Date | string) {
  return new Date(d).toISOString().slice(0, 10)
}

function Line({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <p className="flex items-start gap-1.5 text-xs text-gray-600">
      <span className="mt-[1px] shrink-0">{icon}</span>
      <span className="min-w-0 break-words">{children}</span>
    </p>
  )
}

// A compact, information-dense card for one owned unit on the dashboard:
// occupancy, owned-since, the owner's RFC, the civic roll, the access
// code, and the two owner-arranged people - the Unit Manager (contact +
// area grants + ticket rights) and the cleaner.
export function UnitDetailsCard({
  unitName,
  unitHref,
  occupancy,
  ownedSince,
  ownerRfc,
  civicRoll,
  accessCode,
  accessCodeNotes,
  unitManager,
  cleaner,
}: {
  unitName: string
  unitHref: string
  occupancy: { label: string; detail: string | null }
  ownedSince: Date
  ownerRfc: string | null
  civicRoll: string | null
  accessCode: string | null
  accessCodeNotes: string | null
  unitManager: UnitManagerCard | null
  cleaner: ContactCard | null
}) {
  return (
    <Card>
      <CardContent className="pt-4 space-y-2.5">
        <Link href={unitHref} className="flex items-center justify-between group">
          <span className="text-sm font-bold group-hover:underline">{unitName}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-gray-400">
            {occupancy.label}
            {occupancy.detail ? ` · ${occupancy.detail}` : ""}
            <ChevronRight className="h-3.5 w-3.5 text-gray-300" />
          </span>
        </Link>

        <p className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-0.5">
          <span>Owned since {iso(ownedSince)}</span>
          <span>RFC {ownerRfc || "—"}</span>
          <span>Civic roll {civicRoll || "—"}</span>
        </p>

        {accessCode && (
          <Line icon={<KeyRound className="h-3 w-3" />}>
            Access code <span className="font-mono text-gray-800">{accessCode}</span>
            {accessCodeNotes ? ` — ${accessCodeNotes}` : ""}
          </Line>
        )}

        <div className="grid gap-3 sm:grid-cols-2 border-t pt-2.5">
          {/* Unit Manager */}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <UserCog className="h-3.5 w-3.5" /> Unit Manager
            </p>
            {unitManager ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm font-semibold text-gray-900">{unitManager.name}</p>
                <p className="text-[11px] text-gray-500">{unitManager.assignedBy}</p>
                {unitManager.phone && (
                  <Line icon={<Phone className="h-3 w-3" />}>
                    <a href={`tel:${unitManager.phone.replace(/\s+/g, "")}`} className="hover:underline">
                      {unitManager.phone}
                    </a>
                  </Line>
                )}
                {unitManager.email && (
                  <Line icon={<Mail className="h-3 w-3" />}>
                    <a href={`mailto:${unitManager.email}`} className="hover:underline">
                      {unitManager.email}
                    </a>
                  </Line>
                )}
                {unitManager.areas.length > 0 && (
                  <p className="flex flex-wrap gap-1">
                    {unitManager.areas.map((a) => (
                      <span
                        key={a.label}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-teal-50 text-teal-700 font-medium"
                      >
                        {a.label}: {a.level === "MANAGE" ? "manage" : "view"}
                      </span>
                    ))}
                  </p>
                )}
                {unitManager.canCreateTickets && (
                  <Line icon={<TicketCheck className="h-3 w-3 text-teal-600" />}>
                    Can create &amp; manage tickets
                  </Line>
                )}
                {unitManager.notes && (
                  <p className="text-[11px] text-gray-400">{unitManager.notes}</p>
                )}
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400 italic">
                Owner-managed — assign one (contact, access, ticket rights) from the unit page.
              </p>
            )}
          </div>

          {/* Cleaner */}
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
              <Sparkles className="h-3.5 w-3.5" /> Cleaner
            </p>
            {cleaner ? (
              <div className="mt-1 space-y-1">
                <p className="text-sm font-semibold text-gray-900">{cleaner.name}</p>
                {cleaner.phone && (
                  <Line icon={<Phone className="h-3 w-3" />}>
                    <a href={`tel:${cleaner.phone.replace(/\s+/g, "")}`} className="hover:underline">
                      {cleaner.phone}
                    </a>
                  </Line>
                )}
                {cleaner.email && (
                  <Line icon={<Mail className="h-3 w-3" />}>
                    <a href={`mailto:${cleaner.email}`} className="hover:underline">
                      {cleaner.email}
                    </a>
                  </Line>
                )}
                {cleaner.note && <p className="text-[11px] text-gray-400">{cleaner.note}</p>}
              </div>
            ) : (
              <p className="mt-1 text-xs text-gray-400 italic">
                None recorded — add a Cleaner contact from the unit page.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
