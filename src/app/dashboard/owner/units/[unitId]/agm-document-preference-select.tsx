"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { setUnitAgmDocumentPreference } from "@/app/actions/unit-profile"
import { AgmDocumentPreference } from "@/generated/prisma"
import { AGM_DOCUMENT_PREFERENCES, AGM_DOCUMENT_PREFERENCE_LABEL } from "@/lib/agm-shared"

export function AgmDocumentPreferenceSelect({
  unitId,
  current,
}: {
  unitId: string
  current: AgmDocumentPreference
}) {
  const [value, setValue] = useState<AgmDocumentPreference>(current)
  const [pending, startTransition] = useTransition()

  function change(next: AgmDocumentPreference) {
    const previous = value
    setValue(next)
    startTransition(async () => {
      const result = await setUnitAgmDocumentPreference(unitId, next)
      if (result.success) {
        toast.success("AGM document preference updated")
      } else {
        setValue(previous)
        toast.error(result.error ?? "Couldn't update the preference")
      }
    })
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value as AgmDocumentPreference)}
      className="rounded-md border bg-white px-2 py-1 text-sm disabled:opacity-60"
      aria-label="AGM document preference"
    >
      {AGM_DOCUMENT_PREFERENCES.map((p) => (
        <option key={p} value={p}>
          {AGM_DOCUMENT_PREFERENCE_LABEL[p]}
        </option>
      ))}
    </select>
  )
}
