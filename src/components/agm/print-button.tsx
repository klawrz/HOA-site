"use client"

import { Printer } from "lucide-react"

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="print:hidden inline-flex items-center gap-1.5 rounded-md bg-gray-900 text-white text-sm px-3 py-1.5 hover:bg-gray-800"
    >
      <Printer className="h-4 w-4" /> Print / Save as PDF
    </button>
  )
}
