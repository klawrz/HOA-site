import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { db } from "@/lib/db"
import { ArrowLeft } from "lucide-react"
import { ChargeLedger } from "@/components/charges/charge-ledger"
import { AddChargeDialog } from "@/components/charges/add-charge-dialog"
import { getUnitLabel, unitDisplayName, compareUnitNumbers } from "@/lib/unit-label"
import { canPreviewRole } from "@/lib/role-access"

export default async function PropertyManagerChargesPage() {
  const session = await auth()
  if (!session || !canPreviewRole(session.user.role, "PROPERTY_MANAGER")) redirect("/dashboard")

  const [charges, units, org, unitLabel] = await Promise.all([
    db.unitCharge.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      include: { unit: true },
      orderBy: [{ chargedOn: "desc" }, { createdAt: "desc" }],
    }),
    db.unit.findMany({
      where: { orgId: session.user.orgId ?? undefined },
      select: { id: true, number: true, building: true },
    }),
    db.organization.findUnique({ where: { id: session.user.orgId ?? undefined } }),
    getUnitLabel(session.user.orgId),
  ])

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/dashboard/property-manager/finances"
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Finances
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold">Charges</h1>
            <p className="text-gray-500 mt-1">Ad-hoc charges to a unit — water, fees, or other</p>
          </div>
          <AddChargeDialog unitLabel={unitLabel} units={[...units].sort(compareUnitNumbers)} />
        </div>
      </div>

      <ChargeLedger
        charges={charges.map((c) => ({
          id: c.id,
          unitName: unitDisplayName(unitLabel, c.unit.number, c.unit.building),
          type: c.type,
          label: c.label,
          amount: c.amount,
          amountPaid: c.amountPaid,
          chargedOn: c.chargedOn,
          dueDate: c.dueDate,
        }))}
        currency={org?.baseCurrency ?? "USD"}
        exchangeRate={org?.currentExchangeRate ?? null}
      />
    </div>
  )
}
