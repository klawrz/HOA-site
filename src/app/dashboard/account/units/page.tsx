import { auth } from "@/auth"
import { db } from "@/lib/db"
import { redirect } from "next/navigation"
import { Building2, Trash2, Plus } from "lucide-react"
import { addUnit, deleteUnit } from "@/app/actions/org"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

const statusColors: Record<string, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  OWNER_OCCUPIED: "bg-blue-100 text-blue-700",
  RENTED: "bg-yellow-100 text-yellow-700",
  UNAVAILABLE: "bg-gray-100 text-gray-500",
}

export default async function AccountUnitsPage() {
  const session = await auth()
  if (!session?.user.orgId) redirect("/login")

  const units = await db.unit.findMany({
    where: { orgId: session.user.orgId },
    include: { ownerships: { where: { isCurrent: true }, include: { owner: true } } },
    orderBy: { number: "asc" },
  })

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Units</h1>
        <p className="text-gray-500 text-sm">Manage all units in your HOA.</p>
      </div>

      <form action={addUnit} className="bg-white border rounded-xl p-5 space-y-4">
        <h2 className="font-semibold text-sm">Add a Unit</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Unit Number *</Label>
            <Input name="number" placeholder="1A" required />
          </div>
          <div className="space-y-1">
            <Label>Building</Label>
            <Input name="building" placeholder="Building A" />
          </div>
          <div className="space-y-1">
            <Label>Bedrooms</Label>
            <Input name="bedrooms" type="number" min="0" placeholder="2" />
          </div>
          <div className="space-y-1">
            <Label>Bathrooms</Label>
            <Input name="bathrooms" type="number" step="0.5" min="0" placeholder="1.5" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label>Address Line 1</Label>
            <Input name="addressLine1" />
          </div>
          <div className="space-y-1">
            <Label>Address Line 2</Label>
            <Input name="addressLine2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label>City</Label>
            <Input name="city" />
          </div>
          <div className="space-y-1">
            <Label>State / Province</Label>
            <Input name="state" />
          </div>
          <div className="space-y-1">
            <Label>Postal Code</Label>
            <Input name="postalCode" />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Country</Label>
          <Input name="country" />
        </div>
        <Button type="submit" variant="outline" className="gap-2">
          <Plus className="h-4 w-4" /> Add Unit
        </Button>
      </form>

      <div className="bg-white border rounded-xl divide-y">
        {units.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <Building2 className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p>No units yet</p>
          </div>
        )}
        {units.map((u) => (
          <div key={u.id} className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div>
                <p className="font-medium">Unit {u.number}</p>
                <p className="text-xs text-gray-400">
                  {[u.building, u.bedrooms && `${u.bedrooms}bd`, u.bathrooms && `${u.bathrooms}ba`]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${statusColors[u.status]}`}>
                {u.status.replace(/_/g, " ")}
              </span>
              {u.ownerships[0]?.owner && (
                <span className="text-xs text-gray-500">{u.ownerships[0].owner.name}</span>
              )}
              <form action={deleteUnit.bind(null, u.id)}>
                <button type="submit" className="text-gray-400 hover:text-red-500 transition-colors">
                  <Trash2 className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
