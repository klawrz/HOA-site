import { redirect } from "next/navigation"
import { requireOwnerAccess } from "@/lib/require-owner-access"
import { db } from "@/lib/db"
import { Building2, MapPin } from "lucide-react"
import { OwnerQuickLinkTiles } from "@/components/owner/quick-link-tiles"

// Wraps every owner page (not just the home page) with the same colored
// quick-link tile row - per Dara, 2026-08-28: clicking through to Board
// shouldn't strand you there if you actually meant to go to PM or Unit
// Manager next. requireOwnerAccess/redirect duplicates each page's own
// check, which is fine - it's the cheap, correct way to keep this layout
// safe even if a future page under this route forgets its own guard.
//
// The property identity line (org name + address) moved here from the
// home page on 2026-08-28 per Dara: "can be right up at the top... this
// will reduce the space between the tiles and the block" - it's the very
// first thing on every owner page now, with the tiles right below it.
export default async function OwnerLayout({ children }: { children: React.ReactNode }) {
  const session = await requireOwnerAccess()
  if (!session) redirect("/dashboard")

  const [primaryOwnership, org] = await Promise.all([
    // The earliest-owned unit, same "primary unit" notion the home page
    // tile used before this moved into the layout - good enough for a
    // single Unit Manager shortcut when an owner has more than one unit.
    db.unitOwnership.findFirst({
      where: { ownerId: session.user.id, isCurrent: true },
      select: { unitId: true },
      orderBy: { since: "asc" },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
  ])

  const addressLine = [org?.addressLine1, org?.addressLine2, [org?.city, org?.state, org?.postalCode].filter(Boolean).join(", ")]
    .filter(Boolean)
    .join(" · ")

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          <Building2 className="h-5 w-5 text-gray-400" /> {org?.name ?? "Your Property"}
        </h1>
        {addressLine && (
          <p className="text-sm text-gray-500 mt-0.5 flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5" /> {addressLine}
          </p>
        )}
      </div>
      <OwnerQuickLinkTiles primaryUnitId={primaryOwnership?.unitId ?? null} />
      {children}
    </div>
  )
}
