import { Home, Landmark, Wrench, UserCog, Shield, TicketIcon } from "lucide-react"
import { QuickLinkTiles, type QuickLinkTile } from "@/components/dashboard/quick-link-tiles"

// Lives in the owner section's layout (not just the home page) so it stays
// on screen across Board/PM/Unit Manager/Security/Tickets - per Dara,
// 2026-08-28: "if I click one of those and go to Board... I may then go to
// PM or Unit Manager," i.e. this is a way to hop sideways between those
// destinations without a trip back to the home page each time. "My Unit"
// (back to /dashboard/owner) is deliberately neutral gray, not colored
// like the other five - it's navigation chrome, not one of the "priority
// picks" (Dara: "we can adjust those as we get usage experience" -
// referring to the 5 colored ones).
export function OwnerQuickLinkTiles({ primaryUnitId }: { primaryUnitId: string | null }) {
  const tiles: QuickLinkTile[] = [
    { href: "/dashboard/owner", icon: Home, label: "My Unit", color: "gray" },
    { href: "/dashboard/owner/governance", icon: Landmark, label: "Board", color: "indigo" },
    { href: "/dashboard/owner/property-manager", icon: Wrench, label: "PM", color: "amber" },
    {
      href: primaryUnitId ? `/dashboard/owner/units/${primaryUnitId}#unit-manager` : "/dashboard/owner",
      icon: UserCog,
      label: "Unit Manager",
      color: "teal",
    },
    { href: "/dashboard/owner/governance", icon: Shield, label: "Security", color: "rose" },
    { href: "/dashboard/owner/tickets", icon: TicketIcon, label: "Report an Issue", color: "orange" },
  ]

  return <QuickLinkTiles tiles={tiles} />
}
