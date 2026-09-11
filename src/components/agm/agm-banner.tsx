import Link from "next/link"
import { CalendarClock, ArrowRight } from "lucide-react"
import { formatDateISO } from "@/lib/utils"
import type { AgmBannerInfo } from "@/lib/agm"
import { PackageLink } from "./package-link"

// Dashboard-wide "the AGM is coming" banner - shown to every role during
// the ~3 months before the meeting, since that window is where most of the
// activity happens. Highlighted (indigo) to stand apart from the amber
// warning banners.
export function AgmBanner({ info }: { info: AgmBannerInfo }) {
  const countdown =
    info.daysUntil <= 0
      ? "today"
      : info.daysUntil === 1
        ? "tomorrow"
        : `${info.daysUntil} days away`

  return (
    <div
      className={`print:hidden rounded-xl px-4 py-3 mb-4 flex flex-wrap items-center gap-x-3 gap-y-1 border ${
        info.needsAction
          ? "bg-indigo-50 border-indigo-300"
          : "bg-indigo-50/60 border-indigo-200"
      }`}
    >
      <CalendarClock className="h-5 w-5 text-indigo-600 shrink-0" />
      <p className="text-sm text-indigo-900 flex-1 min-w-0">
        <span className="font-semibold">Annual General Meeting {info.year}</span>
        <span className="text-indigo-700">
          {" "}
          · {formatDateISO(info.dateISO)}
        </span>
        <span className="ml-2 inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-800">
          {countdown}
        </span>
      </p>
      <div className="flex items-center gap-3">
        {info.packageLinks.map((link) => (
          <PackageLink
            key={link.cta}
            link={link}
            className="text-sm font-medium text-indigo-700/80 hover:text-indigo-900 underline decoration-indigo-300 underline-offset-2"
          />
        ))}
        {info.href && info.cta && (
          <Link
            href={info.href}
            className="inline-flex items-center gap-1 text-sm font-medium text-indigo-700 hover:text-indigo-900"
          >
            {info.cta} <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        )}
      </div>
    </div>
  )
}
