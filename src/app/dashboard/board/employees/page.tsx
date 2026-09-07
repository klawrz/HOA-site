import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Users } from "lucide-react"
import { canPreviewRole } from "@/lib/role-access"
import { EmployeeList, type EmployeeRow } from "@/components/employees/employee-list"
import { EmployeeDialog } from "@/components/employees/employee-dialog"

function toDateInput(d: Date | null): string | null {
  if (!d || isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}

export default async function BoardEmployeesPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "BOARD_MEMBER")) redirect("/dashboard")

  // Add/remove is Board Member or PM only - derived from the REAL role, not
  // the previewed one, so an Account Owner previewing this page sees it
  // read-only rather than buttons that would silently fail.
  const canManage =
    session.user.role === "BOARD_MEMBER" ||
    session.user.role === "PROPERTY_MANAGER" ||
    session.user.isBoardMember

  const employees = await db.employee.findMany({
    where: { orgId: session.user.orgId ?? undefined },
    include: { govIds: true },
    orderBy: [{ status: "asc" }, { sortOrder: "asc" }],
  })

  const rows: EmployeeRow[] = employees.map((e) => ({
    id: e.id,
    name: e.name,
    employeeNumber: e.employeeNumber,
    position: e.position,
    reportsTo: e.reportsTo,
    phone: e.phone,
    email: e.email,
    homeAddress: e.homeAddress,
    hireDate: toDateInput(e.hireDate),
    endDate: toDateInput(e.endDate),
    status: e.status,
    notes: e.notes,
    govIds: e.govIds.map((g) => ({ type: g.type, label: g.label, value: g.value })),
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Employees</h1>
        <p className="text-gray-500 mt-1">
          The HOA&apos;s own payroll staff — who they are, how to reach them, and their government program registrations
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" /> Staff Roster
          </CardTitle>
          {canManage && <EmployeeDialog />}
        </CardHeader>
        <CardContent>
          <EmployeeList employees={rows} canManage={canManage} />
        </CardContent>
      </Card>
    </div>
  )
}
