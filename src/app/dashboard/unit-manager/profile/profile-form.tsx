"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateUnitManagerProfile } from "@/app/actions/unit-manager-profile"
import { SPECIALTY_LABELS } from "@/lib/unit-manager-specialties"
import { UnitManagerArea } from "@/generated/prisma"

const SPECIALTIES = Object.keys(SPECIALTY_LABELS) as UnitManagerArea[]

interface ProfileData {
  company: string | null
  headline: string | null
  bio: string | null
  phone: string | null
  yearsExperience: number | null
  specialties: UnitManagerArea[]
  directoryVisible: boolean
}

export function ProfileForm({ initial }: { initial: ProfileData }) {
  const [company, setCompany] = useState(initial.company ?? "")
  const [headline, setHeadline] = useState(initial.headline ?? "")
  const [bio, setBio] = useState(initial.bio ?? "")
  const [phone, setPhone] = useState(initial.phone ?? "")
  const [yearsExperience, setYearsExperience] = useState(
    initial.yearsExperience != null ? String(initial.yearsExperience) : ""
  )
  const [specialties, setSpecialties] = useState<UnitManagerArea[]>(initial.specialties)
  const [directoryVisible, setDirectoryVisible] = useState(initial.directoryVisible)
  const [saving, setSaving] = useState(false)

  function toggleSpecialty(area: UnitManagerArea) {
    setSpecialties((prev) => (prev.includes(area) ? prev.filter((a) => a !== area) : [...prev, area]))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const result = await updateUnitManagerProfile({
      company: company || undefined,
      headline: headline || undefined,
      bio: bio || undefined,
      phone: phone || undefined,
      yearsExperience: yearsExperience ? Number(yearsExperience) : undefined,
      specialties,
      directoryVisible,
    })
    setSaving(false)
    if (result.success) {
      toast.success("Profile saved")
    } else {
      toast.error("Failed to save profile")
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="flex items-start gap-2 text-sm bg-gray-50 border rounded-lg p-3">
        <input
          type="checkbox"
          className="accent-gray-900 mt-0.5"
          checked={directoryVisible}
          onChange={(e) => setDirectoryVisible(e.target.checked)}
        />
        <span>
          <span className="font-medium">List me in the Unit Manager directory</span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Owners looking for a Unit Manager will be able to find and pick you. Uncheck this if
            you only want to be assignable to units you already know about.
          </span>
        </span>
      </label>

      <div className="space-y-1">
        <Label>Headline</Label>
        <Input
          value={headline}
          onChange={(e) => setHeadline(e.target.value)}
          placeholder="e.g. Reliable cleaning & guest turnover, 24/7 availability"
          maxLength={100}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label>Company (optional)</Label>
          <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="e.g. Gerry's Property Care" />
        </div>
        <div className="space-y-1">
          <Label>Phone</Label>
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
      </div>

      <div className="space-y-1">
        <Label>Years of experience</Label>
        <Input
          type="number"
          min={0}
          value={yearsExperience}
          onChange={(e) => setYearsExperience(e.target.value)}
          className="w-32"
        />
      </div>

      <div className="space-y-1">
        <Label>Specialties</Label>
        <div className="grid grid-cols-2 gap-2">
          {SPECIALTIES.map((area) => (
            <label key={area} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="accent-gray-900"
                checked={specialties.includes(area)}
                onChange={() => toggleSpecialty(area)}
              />
              {SPECIALTY_LABELS[area]}
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-1">
        <Label>Bio</Label>
        <Textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          className="h-24 resize-none"
          placeholder="Tell Owners what you do, how you work, and what makes you a good fit."
        />
      </div>

      <Button type="submit" disabled={saving}>
        {saving ? "Saving..." : "Save Profile"}
      </Button>
    </form>
  )
}
