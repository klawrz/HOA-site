"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Mail, Phone, MapPin, Pencil, Trash2, IdCard, CalendarDays } from "lucide-react"
import { deleteEmployee } from "@/app/actions/employees"
import { employeeStatusLabel, employeeStatusColor, employeeGovIdTypeLabel } from "@/lib/employee-styles"

// hireDate / endDate arrive as "yyyy-mm-dd" strings (see toDateInput on the
// page). Parse + format as UTC so the calendar day shows the same whatever
// timezone the viewer is in - a plain new Date("yyyy-mm-dd") is UTC
// midnight, which toLocaleDateString would otherwise shift back a day for
// viewers west of UTC.
function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-US", { dateStyle: "medium", timeZone: "UTC" })
}
import { EmployeeDialog, type ExistingEmployee } from "./employee-dialog"
import type { EmployeeStatus } from "@/generated/prisma"

export interface EmployeeRow extends ExistingEmployee {
  status: EmployeeStatus
}

const STATUS_ORDER: EmployeeStatus[] = ["ACTIVE", "ON_LEAVE", "FORMER"]

function EmployeeCard({ employee, canManage }: { employee: EmployeeRow; canManage: boolean }) {
  const [removing, setRemoving] = useState(false)

  async function handleRemove() {
    if (!confirm(`Remove ${employee.name} from the employee roster?`)) return
    setRemoving(true)
    const result = await deleteEmployee(employee.id)
    setRemoving(false)
    if (!result.success) toast.error(result.error || "Failed to remove employee")
  }

  return (
    <div className="bg-gray-50 rounded-lg px-3 py-2.5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-medium">{employee.name}</p>
            {employee.employeeNumber && (
              <span className="text-xs text-gray-400">#{employee.employeeNumber}</span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${employeeStatusColor[employee.status]}`}
            >
              {employeeStatusLabel[employee.status]}
            </span>
          </div>
          {(employee.position || employee.reportsTo) && (
            <p className="text-xs text-gray-500 mt-0.5">
              {employee.position}
              {employee.position && employee.reportsTo && " · "}
              {employee.reportsTo && `Reports to ${employee.reportsTo}`}
            </p>
          )}
          <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-gray-500 mt-1">
            {employee.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" /> {employee.phone}
              </span>
            )}
            {employee.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" /> {employee.email}
              </span>
            )}
            {employee.hireDate && (
              <span className="flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Hired {fmtDate(employee.hireDate)}
                {employee.endDate && ` – ${fmtDate(employee.endDate)}`}
              </span>
            )}
          </div>
          {employee.homeAddress && (
            <p className="flex items-start gap-1 text-xs text-gray-500 mt-1">
              <MapPin className="h-3 w-3 mt-0.5 shrink-0" /> <span className="whitespace-pre-line">{employee.homeAddress}</span>
            </p>
          )}
          {employee.govIds.length > 0 && (
            <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500 mt-1">
              {employee.govIds.map((g, i) => (
                <span key={i} className="flex items-center gap-1">
                  <IdCard className="h-3 w-3" />
                  {g.type === "OTHER" ? g.label || "Other" : employeeGovIdTypeLabel[g.type]}: {g.value}
                </span>
              ))}
            </div>
          )}
          {employee.notes && <p className="text-xs text-gray-400 mt-1">{employee.notes}</p>}
        </div>
        {canManage && (
          <div className="flex items-center gap-2 shrink-0">
            <EmployeeDialog
              existing={employee}
              trigger={
                <button className="text-gray-400 hover:text-gray-700 transition-colors" aria-label="Edit">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              }
            />
            <button
              onClick={handleRemove}
              disabled={removing}
              className="text-gray-400 hover:text-red-500 transition-colors disabled:opacity-50"
              aria-label="Remove"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export function EmployeeList({ employees, canManage }: { employees: EmployeeRow[]; canManage: boolean }) {
  if (employees.length === 0) {
    return <p className="text-sm text-gray-500">No employees on file yet.</p>
  }

  const grouped = STATUS_ORDER.map((status) => ({
    status,
    rows: employees.filter((e) => e.status === status),
  })).filter((g) => g.rows.length > 0)

  return (
    <div className="space-y-4">
      {grouped.map(({ status, rows }) => (
        <div key={status}>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${employeeStatusColor[status]}`}
          >
            {employeeStatusLabel[status]} ({rows.length})
          </span>
          <div className="space-y-2 mt-2">
            {rows.map((e) => (
              <EmployeeCard key={e.id} employee={e} canManage={canManage} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
