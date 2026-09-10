import { db } from "@/lib/db"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { getEffectiveOperatingBudget, duesInstalments, type DuesInstalment } from "@/lib/dues-schedule"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { AREA_LABELS } from "@/lib/unit-manager-area"
import type { DuesFrequency, UnitManagerArea, UnitManagerLevel } from "@/generated/prisma"

// Everything an owner needs to see about money owed on their unit(s) - the
// anticipated dues schedule from the effective (approved, else proposed)
// budget, the assessments and per-villa charges, and the "who to contact"
// trio (Property Manager, the owner-delegated Unit Manager, Security).
// Shared by the owner dashboard and the Dues & Assessments page.

export interface ContactCard {
  name: string
  role?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
}

export interface UnitManagerCard {
  name: string
  assignedBy: string // "Delegated by the owner"
  phone: string | null
  email: string | null
  notes: string | null
  accessCode: string | null
  accessCodeNotes: string | null
  areas: { label: string; level: UnitManagerLevel }[]
  canCreateTickets: boolean
  unitName: string
}

export interface OwnerUnitFinance {
  unitId: string
  unitName: string
  allocationPercent: number
  duesFrequency: DuesFrequency
  annualDuesUsd: number | null
  instalments: DuesInstalment[]
  assessments: {
    id: string
    title: string
    type: string
    anticipated: boolean
    dueDate: Date
    evenSplit: boolean
    amountDueUsd: number
    amountPaidUsd: number
  }[]
  charges: {
    id: string
    label: string
    chargedOn: Date
    dueDate: Date | null
    amountUsd: number
    amountPaidUsd: number
  }[]
}

export interface OwnerFinancialOverview {
  budget: Awaited<ReturnType<typeof getEffectiveOperatingBudget>>
  units: OwnerUnitFinance[]
  totalOutstandingUsd: number
  anticipatedDuesTotalUsd: number
  anticipatedAssessmentTotalUsd: number
  propertyManager: ContactCard | null
  unitManager: UnitManagerCard | null
  security: ContactCard | null
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

export async function getOwnerFinancialOverview(session: {
  user: { id: string; orgId: string | null }
}): Promise<OwnerFinancialOverview> {
  const orgId = session.user.orgId ?? ""

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    include: { unit: true },
    orderBy: { unit: { number: "asc" } },
  })
  const unitIds = ownerships.map((o) => o.unitId)

  const [
    budget,
    orgUnits,
    org,
    unitLabel,
    assessmentCharges,
    unitCharges,
    pmContract,
    unitManagers,
    keyContacts,
  ] = await Promise.all([
    getEffectiveOperatingBudget(orgId),
    db.unit.findMany({ where: { orgId }, select: { id: true, allocationPercent: true } }),
    db.organization.findUnique({
      where: { id: orgId },
      select: { baseCurrency: true, currentExchangeRate: true },
    }),
    getUnitLabel(orgId),
    unitIds.length
      ? db.assessmentCharge.findMany({
          where: { unitId: { in: unitIds } },
          include: { assessment: true },
          orderBy: { assessment: { dueDate: "asc" } },
        })
      : Promise.resolve([]),
    unitIds.length
      ? db.unitCharge.findMany({
          where: { unitId: { in: unitIds } },
          orderBy: { chargedOn: "desc" },
        })
      : Promise.resolve([]),
    db.pMContract.findFirst({
      where: { orgId, status: "ACTIVE" },
      include: { company: { include: { emergencyContacts: true } } },
      orderBy: { startDate: "desc" },
    }),
    unitIds.length
      ? db.unitManagerAssignment.findMany({
          where: { unitId: { in: unitIds } },
          include: { user: true, grants: true, unit: true },
        })
      : Promise.resolve([]),
    db.keyContact.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } }),
  ])

  const allocations = effectiveAllocations(orgUnits)
  const rate = org?.currentExchangeRate ?? 17.5
  const base = org?.baseCurrency ?? "USD"
  const toUsd = (amt: number) => (base === "MXN" ? amt / rate : amt)

  const units: OwnerUnitFinance[] = ownerships.map((o) => {
    const pct = allocations.get(o.unitId) ?? 0
    const annual = budget ? budget.totalUsd * (pct / 100) : null
    const instalments =
      budget && annual != null ? duesInstalments(annual, o.unit.duesFrequency, budget.year) : []
    return {
      unitId: o.unitId,
      unitName: unitDisplayName(unitLabel, o.unit.number, o.unit.building),
      allocationPercent: pct,
      duesFrequency: o.unit.duesFrequency,
      annualDuesUsd: annual,
      instalments,
      assessments: assessmentCharges
        .filter((c) => c.unitId === o.unitId)
        .map((c) => ({
          id: c.id,
          title: c.assessment.title,
          type: c.assessment.type,
          anticipated: c.assessment.status !== "ISSUED",
          dueDate: c.assessment.dueDate,
          evenSplit: c.assessment.split === "EVEN",
          amountDueUsd: toUsd(c.amountDue),
          amountPaidUsd: toUsd(c.amountPaid),
        })),
      charges: unitCharges
        .filter((c) => c.unitId === o.unitId)
        .map((c) => ({
          id: c.id,
          label: c.label ?? titleCase(c.type),
          chargedOn: c.chargedOn,
          dueDate: c.dueDate,
          amountUsd: toUsd(c.amount),
          amountPaidUsd: toUsd(c.amountPaid),
        })),
    }
  })

  const anticipatedDuesTotalUsd = units.reduce((s, u) => s + (u.annualDuesUsd ?? 0), 0)
  const anticipatedAssessmentTotalUsd = units.reduce(
    (s, u) => s + u.assessments.filter((a) => a.anticipated).reduce((t, a) => t + a.amountDueUsd, 0),
    0,
  )
  const totalOutstandingUsd =
    units.reduce(
      (s, u) =>
        s +
        u.assessments
          .filter((a) => !a.anticipated)
          .reduce((t, a) => t + Math.max(a.amountDueUsd - a.amountPaidUsd, 0), 0) +
        u.charges.reduce((t, c) => t + Math.max(c.amountUsd - c.amountPaidUsd, 0), 0),
      0,
    )

  // Property Manager
  const company = pmContract?.company
  const ec = company?.emergencyContacts[0]
  const propertyManager: ContactCard | null = company
    ? {
        name: company.legalName,
        role: company.primaryContactName ? `Contact: ${company.primaryContactName}` : null,
        phone: company.primaryContactPhone ?? company.phone ?? null,
        email: company.primaryContactEmail ?? company.email ?? null,
        note: ec ? `After-hours: ${ec.name}${ec.phone ? ` · ${ec.phone}` : ""}` : null,
      }
    : null

  // Unit Manager - richer, since it's an owner-delegated role with its own
  // contact details, the unit access code, notes, and area grants.
  const firstAssignment = unitManagers[0]
  const firstOwnedUnit = ownerships[0]?.unit
  const unitManager: UnitManagerCard | null = firstAssignment
    ? {
        name:
          firstAssignment.user?.name ??
          firstAssignment.name ??
          firstAssignment.user?.email ??
          "Unit Manager",
        assignedBy:
          unitManagers.length > 1 ? "Delegated by the owner (multiple units)" : "Delegated by the owner",
        phone: firstAssignment.phone ?? null,
        email: firstAssignment.user?.email ?? firstAssignment.email ?? null,
        notes: firstAssignment.notes ?? null,
        accessCode: firstAssignment.unit.accessCode ?? null,
        accessCodeNotes: firstAssignment.unit.accessCodeNotes ?? null,
        areas: firstAssignment.grants.map((g) => ({
          label: AREA_LABELS[g.area as UnitManagerArea] ?? g.area,
          level: g.level,
        })),
        canCreateTickets: firstAssignment.grants.some(
          (g) => g.area === "TICKETS" && g.level === "MANAGE",
        ),
        unitName: unitDisplayName(unitLabel, firstAssignment.unit.number, firstAssignment.unit.building),
      }
    : firstOwnedUnit
      ? {
          name: "Owner-managed",
          assignedBy: "No Unit Manager delegated",
          phone: null,
          email: null,
          notes: null,
          accessCode: firstOwnedUnit.accessCode ?? null,
          accessCodeNotes: firstOwnedUnit.accessCodeNotes ?? null,
          areas: [],
          canCreateTickets: false,
          unitName: unitDisplayName(unitLabel, firstOwnedUnit.number, firstOwnedUnit.building),
        }
      : null

  const securityContact =
    keyContacts.find((c) => c.category === "SECURITY") ??
    keyContacts.find((c) => /security/i.test(c.role ?? "") || /security/i.test(c.name))
  const security: ContactCard | null = securityContact
    ? {
        name: securityContact.name,
        role: securityContact.role,
        phone: securityContact.phone,
        email: securityContact.email,
        note: securityContact.notes,
      }
    : null

  return {
    budget,
    units,
    totalOutstandingUsd,
    anticipatedDuesTotalUsd,
    anticipatedAssessmentTotalUsd,
    propertyManager,
    unitManager,
    security,
  }
}
