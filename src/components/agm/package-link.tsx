"use client"

import { useTransition } from "react"
import { setViewerAgmDocumentPreference } from "@/app/actions/agm"
import type { AgmBannerPackageLink } from "@/lib/agm"

// A banner package link. Plain nav for Board/PM's admin copies; for an
// owner's own link (setPreference set) it first saves that as the default
// for every villa they own, then opens the document - so the choice they
// just made sticks the next time they (or the app) fetch their package.
export function PackageLink({ link, className }: { link: AgmBannerPackageLink; className: string }) {
  const [pending, startTransition] = useTransition()

  if (!link.setPreference) {
    return (
      <a href={link.href} target="_blank" rel="noopener noreferrer" className={className}>
        {link.cta}
      </a>
    )
  }

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-disabled={pending}
      className={className}
      onClick={(e) => {
        e.preventDefault()
        if (pending) return
        startTransition(async () => {
          await setViewerAgmDocumentPreference(link.setPreference!)
          window.open(link.href, "_blank", "noopener,noreferrer")
        })
      }}
    >
      {link.cta}
    </a>
  )
}
