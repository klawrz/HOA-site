"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { setUnitDuesFrequency } from "@/app/actions/unit-profile"
import { DuesFrequency } from "@/generated/prisma"
import { DUES_FREQUENCIES, DUES_FREQUENCY_LABEL } from "@/lib/dues"

export function DuesFrequencySelect({ unitId, current }: { unitId: string; current: DuesFrequency }) {
  const [value, setValue] = useState<DuesFrequency>(current)
  const [pending, startTransition] = useTransition()

  function change(next: DuesFrequency) {
    const previous = value
    setValue(next)
    startTransition(async () => {
      const result = await setUnitDuesFrequency(unitId, next)
      if (result.success) {
        toast.success("Payment schedule updated")
      } else {
        setValue(previous)
        toast.error(result.error ?? "Couldn't update the payment schedule")
      }
    })
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => change(e.target.value as DuesFrequency)}
      className="rounded-md border bg-white px-2 py-1 text-sm disabled:opacity-60"
      aria-label="Dues payment schedule"
    >
      {DUES_FREQUENCIES.map((f) => (
        <option key={f} value={f}>
          {DUES_FREQUENCY_LABEL[f]}
        </option>
      ))}
    </select>
  )
}
