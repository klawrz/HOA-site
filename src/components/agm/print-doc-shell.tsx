import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { PrintButton } from "./print-button"

// Shared chrome for the AGM print/generate pages - a screen-only toolbar
// (back link + Print button) above the printable document body.
export function PrintDocShell({
  title,
  subtitle,
  backHref,
  children,
}: {
  title: string
  subtitle?: string
  backHref: string
  children: React.ReactNode
}) {
  return (
    <div className="max-w-3xl mx-auto p-6 print:p-0 space-y-6 text-gray-900">
      <div className="flex items-start justify-between gap-4 print:hidden">
        <div>
          <Link
            href={backHref}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to the AGM
          </Link>
          <h1 className="text-xl font-bold">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
        </div>
        <PrintButton />
      </div>
      {children}
    </div>
  )
}
