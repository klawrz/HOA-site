import Link from "next/link"
import type { LucideIcon } from "lucide-react"

export type QuickLinkColor = "gray" | "indigo" | "amber" | "teal" | "rose" | "orange"

export interface QuickLinkTile {
  href: string
  icon: LucideIcon
  label: string
  color: QuickLinkColor
}

// Written out as full literal class names (not template-built) so
// Tailwind's content scanner actually picks them up. Exported so other
// "priority tile" rows (e.g. the Board home page's Finances/PM/Units/
// Employees/AGM tiles) render with the exact same colour system.
export const quickLinkColors: Record<QuickLinkColor, { bg: string; hoverBg: string; chip: string; icon: string; text: string }> = {
  gray: { bg: "bg-gray-100", hoverBg: "hover:bg-gray-200", chip: "bg-gray-200", icon: "text-gray-600", text: "text-gray-700" },
  indigo: { bg: "bg-indigo-50", hoverBg: "hover:bg-indigo-100", chip: "bg-indigo-100", icon: "text-indigo-600", text: "text-indigo-800" },
  amber: { bg: "bg-amber-50", hoverBg: "hover:bg-amber-100", chip: "bg-amber-100", icon: "text-amber-600", text: "text-amber-800" },
  teal: { bg: "bg-teal-50", hoverBg: "hover:bg-teal-100", chip: "bg-teal-100", icon: "text-teal-600", text: "text-teal-800" },
  rose: { bg: "bg-rose-50", hoverBg: "hover:bg-rose-100", chip: "bg-rose-100", icon: "text-rose-600", text: "text-rose-800" },
  orange: { bg: "bg-orange-50", hoverBg: "hover:bg-orange-100", chip: "bg-orange-100", icon: "text-orange-600", text: "text-orange-800" },
}

// The generic rendering engine behind every role's persistent quick-link
// row (Owner's src/components/owner/quick-link-tiles.tsx was the first,
// Property Manager's src/components/property-manager/quick-link-tiles.tsx
// followed the same shape) - each role builds its own tiles array and
// hands it to this one component, so the actual grid/color/hover styling
// only lives in one place. Per Dara, these are "priority picks" meant to
// be adjusted per role as we get usage experience, so keeping the list
// itself in the role-specific wrapper (not here) is deliberate.
export function QuickLinkTiles({ tiles }: { tiles: QuickLinkTile[] }) {
  return (
    <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))` }}>
      {tiles.map((tile, i) => (
        <Link
          key={i}
          href={tile.href}
          className={`flex flex-col items-center gap-1 rounded-xl px-1.5 py-2.5 text-center transition-colors ${quickLinkColors[tile.color].bg} ${quickLinkColors[tile.color].hoverBg}`}
        >
          <span className={`flex items-center justify-center h-7 w-7 rounded-full ${quickLinkColors[tile.color].chip}`}>
            <tile.icon className={`h-3.5 w-3.5 ${quickLinkColors[tile.color].icon}`} />
          </span>
          <span className={`text-[11px] font-semibold leading-tight ${quickLinkColors[tile.color].text}`}>
            {tile.label}
          </span>
        </Link>
      ))}
    </div>
  )
}
