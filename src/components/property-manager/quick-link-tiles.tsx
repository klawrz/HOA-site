import { LayoutDashboard, TicketIcon, FileText, DollarSign, Users, Building2 } from "lucide-react"
import { QuickLinkTiles, type QuickLinkTile } from "@/components/dashboard/quick-link-tiles"

// Same persistent-tile-row pattern as the Owner section (see
// src/components/owner/quick-link-tiles.tsx) - per Dara, 2026-08-28:
// "As Property Manager... block with similar tiles across the top,"
// naming Tickets, Contracts, Budget, Contacts, Units. "Overview" (back to
// /dashboard/property-manager) is the same neutral-gray "how do I get
// home" tile added to Owner's row after he hit that exact gap.
const tiles: QuickLinkTile[] = [
  { href: "/dashboard/property-manager", icon: LayoutDashboard, label: "Overview", color: "gray" },
  { href: "/dashboard/property-manager/tickets", icon: TicketIcon, label: "Tickets", color: "orange" },
  { href: "/dashboard/property-manager/contracts", icon: FileText, label: "Contracts", color: "amber" },
  { href: "/dashboard/property-manager/finances", icon: DollarSign, label: "Budget", color: "indigo" },
  { href: "/dashboard/property-manager/owners", icon: Users, label: "Contacts", color: "teal" },
  { href: "/dashboard/property-manager/units", icon: Building2, label: "Units", color: "rose" },
]

export function PropertyManagerQuickLinkTiles() {
  return <QuickLinkTiles tiles={tiles} />
}
