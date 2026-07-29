"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Landmark } from "lucide-react"
import { setBoardMember } from "@/app/actions/org"

export function BoardMemberToggle({
  memberId,
  initialValue,
}: {
  memberId: string
  initialValue: boolean
}) {
  const [checked, setChecked] = useState(initialValue)
  const [saving, setSaving] = useState(false)

  async function handleChange(value: boolean) {
    setChecked(value)
    setSaving(true)
    const result = await setBoardMember(memberId, value)
    setSaving(false)
    if (result.success) {
      toast.success(value ? "Granted Board governance access" : "Board governance access removed")
    } else {
      setChecked(!value)
      toast.error("Failed to update")
    }
  }

  return (
    <div className="bg-white border rounded-xl p-5">
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          className="accent-gray-900 mt-1"
          checked={checked}
          disabled={saving}
          onChange={(e) => handleChange(e.target.checked)}
        />
        <span>
          <span className="font-medium text-sm flex items-center gap-1.5">
            <Landmark className="h-3.5 w-3.5 text-gray-400" /> Board Member
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Grants Board governance management - scheduling meetings, recording minutes, and the
            document repository - alongside this person&apos;s existing role. Doesn&apos;t change
            their primary role or portal.
          </span>
        </span>
      </label>
    </div>
  )
}
