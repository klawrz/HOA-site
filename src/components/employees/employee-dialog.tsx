"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createEmployee, updateEmployee, type EmployeeInput } from "@/app/actions/employees"
import { employeeStatusLabel, employeeGovIdTypeLabel, EMPLOYEE_GOV_ID_TYPES } from "@/lib/employee-styles"
import type { EmployeeGovIdType, EmployeeStatus } from "@/generated/prisma"

const STATUS_VALUES: EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "FORMER"]

interface GovIdRow {
  type: EmployeeGovIdType
  label: string
  value: string
}

export interface ExistingEmployee {
  id: string
  name: string
  employeeNumber: string | null
  position: string | null
  reportsTo: string | null
  phone: string | null
  email: string | null
  homeAddress: string | null
  hireDate: string | null // yyyy-mm-dd
  endDate: string | null // yyyy-mm-dd
  status: EmployeeStatus
  notes: string | null
  govIds: { type: EmployeeGovIdType; label: string | null; value: string }[]
}

export function EmployeeDialog({
  existing,
  trigger,
}: {
  existing?: ExistingEmployee
  trigger?: React.ReactNode
}) {
  const isEdit = !!existing
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const [status, setStatus] = useState<EmployeeStatus>(existing?.status ?? "ACTIVE")
  const [govIds, setGovIds] = useState<GovIdRow[]>(
    existing?.govIds.map((g) => ({ type: g.type, label: g.label ?? "", value: g.value })) ?? []
  )

  function addGovId() {
    setGovIds((rows) => [...rows, { type: "IMSS", label: "", value: "" }])
  }
  function updateGovId(idx: number, patch: Partial<GovIdRow>) {
    setGovIds((rows) => rows.map((r, i) => (i === idx ? { ...r, ...patch } : r)))
  }
  function removeGovId(idx: number) {
    setGovIds((rows) => rows.filter((_, i) => i !== idx))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setError("")
    const form = new FormData(e.currentTarget)
    const name = (form.get("name") as string)?.trim()
    if (!name) {
      setError("Name is required")
      return
    }

    const data: EmployeeInput = {
      name,
      employeeNumber: (form.get("employeeNumber") as string) || undefined,
      position: (form.get("position") as string) || undefined,
      reportsTo: (form.get("reportsTo") as string) || undefined,
      phone: (form.get("phone") as string) || undefined,
      email: (form.get("email") as string) || undefined,
      homeAddress: (form.get("homeAddress") as string) || undefined,
      hireDate: (form.get("hireDate") as string) || undefined,
      endDate: (form.get("endDate") as string) || undefined,
      status,
      notes: (form.get("notes") as string) || undefined,
      govIds: govIds
        .filter((g) => g.value.trim())
        .map((g) => ({
          type: g.type,
          label: g.type === "OTHER" ? g.label.trim() || undefined : undefined,
          value: g.value.trim(),
        })),
    }

    setSaving(true)
    const result = isEdit ? await updateEmployee(existing.id, data) : await createEmployee(data)
    setSaving(false)
    if (result.success) {
      toast.success(isEdit ? "Employee updated" : "Employee added")
      setOpen(false)
    } else {
      setError(result.error || "Failed to save")
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={trigger ? (trigger as React.ReactElement) : <Button size="sm">+ Add Employee</Button>} />
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add Employee"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1">
            <Label>Full name</Label>
            <Input name="name" defaultValue={existing?.name} required />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Employee number</Label>
              <Input name="employeeNumber" defaultValue={existing?.employeeNumber ?? ""} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Position</Label>
              <Input name="position" defaultValue={existing?.position ?? ""} placeholder="e.g. Concierge" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Reports to</Label>
            <Input
              name="reportsTo"
              defaultValue={existing?.reportsTo ?? ""}
              placeholder="e.g. Property Manager, Board President"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="phone" defaultValue={existing?.phone ?? ""} placeholder="Optional" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input name="email" type="email" defaultValue={existing?.email ?? ""} placeholder="Optional" />
            </div>
          </div>

          <div className="space-y-1">
            <Label>Home address</Label>
            <Textarea
              name="homeAddress"
              defaultValue={existing?.homeAddress ?? ""}
              placeholder="Where the employee lives"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Date hired</Label>
              <Input name="hireDate" type="date" defaultValue={existing?.hireDate ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>End date</Label>
              <Input name="endDate" type="date" defaultValue={existing?.endDate ?? ""} />
            </div>
            <div className="space-y-1">
              <Label>Status</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus((v as EmployeeStatus) ?? "ACTIVE")}
                items={employeeStatusLabel}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_VALUES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {employeeStatusLabel[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center justify-between">
              <Label>Government program numbers</Label>
              <Button type="button" variant="outline" size="sm" onClick={addGovId}>
                <Plus className="h-3.5 w-3.5" /> Add
              </Button>
            </div>
            {govIds.length === 0 && (
              <p className="text-xs text-gray-400">None recorded. Add IMSS, CURP, RFC, INFONAVIT, etc.</p>
            )}
            {govIds.map((row, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <Select
                  value={row.type}
                  onValueChange={(v) => updateGovId(idx, { type: (v as EmployeeGovIdType) ?? "IMSS" })}
                  items={employeeGovIdTypeLabel}
                >
                  <SelectTrigger className="w-40 shrink-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EMPLOYEE_GOV_ID_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {employeeGovIdTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex-1 space-y-1">
                  {row.type === "OTHER" && (
                    <Input
                      value={row.label}
                      onChange={(e) => updateGovId(idx, { label: e.target.value })}
                      placeholder="Program name"
                    />
                  )}
                  <Input
                    value={row.value}
                    onChange={(e) => updateGovId(idx, { value: e.target.value })}
                    placeholder="Number"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeGovId(idx)}
                  className="text-gray-400 hover:text-red-500 transition-colors mt-2"
                  aria-label="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="space-y-1">
            <Label>Notes</Label>
            <Textarea name="notes" defaultValue={existing?.notes ?? ""} placeholder="Optional" rows={2} />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex gap-2 justify-end pt-1">
            <Button variant="outline" type="button" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
