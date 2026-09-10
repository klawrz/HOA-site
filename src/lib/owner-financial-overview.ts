import { db } from "@/lib/db"
import { effectiveAllocations } from "@/lib/unit-allocation"
import { getEffectiveOperatingBudget, duesInstalments, type DuesInstalment } from "@/lib/dues-schedule"
import { getUnitLabel, unitDisplayName } from "@/lib/unit-label"
import { AREA_LABELS } from "@/lib/unit-manager-area"
import type { DuesFrequency, UnitManagerArea, UnitManagerLevel } from "@/generated/prisma"

// Everything an owner needs to see about their unit(s) on the dashboard and
// the Dues & Assessments page: the anticipated dues schedule from the
// effective (approved, else proposed) budget, assessments, per-villa
// charges grouped by quarter, and the people attached to the unit
// (Property Manager, the owner-delegated Unit Manager, cleaner, Security).

export interface ContactCard {
  name: string
  role?: string | null
  phone?: string | null
  email?: string | null
  note?: string | null
}

export interface UnitManagerCard {
  name: string
  assignedBy: string
  phone: string | null
  email: string | null
  notes: string | null
  accessCode: string | null
  accessCodeNotes: string | null
  areas: { label: string; level: UnitManagerLevel }[]
  canCreateTickets: boolean
  unitName: string
}

export interface QuarterCharge {
  label: string // "Q3 2027"
  dueDate: Date // last day of that quarter
  totalUsd: number
  paidUsd: number
}

export interface OwnerUnitFinance {
  unitId: string
  unitNumber: string
  unitName: string
  ownedSince: Date
  civicRoll: string | null
  accessCode: string | null
  accessCodeNotes: string | null
  allocationPercent: number
  duesFrequency: DuesFrequency
  paymentScheduleLabel: string
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
  quarterlyCharges: QuarterCharge[]
  unitManager: UnitManagerCard | null
  cleaner: ContactCard | null
}

export interface OwnerFinancialOverview {
  budget: Awaited<ReturnType<typeof getEffectiveOperatingBudget>>
  ownerRfc: string | null
  units: OwnerUnitFinance[]
  totalOutstandingUsd: number
  anticipatedDuesTotalUsd: number
  anticipatedAssessmentTotalUsd: number
  propertyManager: ContactCard | null
  security: ContactCard | null
}

function titleCase(s: string) {
  return s.charAt(0) + s.slice(1).toLowerCase()
}

const SCHEDULE_LABEL: Record<DuesFrequency, string> = {
  QUARTERLY: "4 quarterly instalments",
  SEMI_ANNUAL: "2 semi-annual instalments",
  ANNUAL: "1 annual payment",
}

// Last calendar day of the quarter a date falls in, at UTC midnight.
function endOfQuarter(d: Date): Date {
  const q = Math.floor(d.getUTCMonth() / 3)
  return new Date(Date.UTC(d.getUTCFullYear(), q * 3 + 3, 0))
}

export async function getOwnerFinancialOverview(session: {
  user: { id: string; orgId: string | null }
}): Promise<OwnerFinancialOverview> {
  const orgId = session.user.orgId ?? ""

  const ownerships = await db.unitOwnership.findMany({
    where: { ownerId: session.user.id, isCurrent: true },
    include: {
      unit: {
        include: {
          managers: { include: { user: true, grants: true } },
          contacts: true,
        },
      },
    },
    orderBy: { unit: { number: "asc" } },
  })
  const unitIds = ownerships.map((o) => o.unitId)

  const [budget, orgUnits, org, unitLabel, me, assessmentCharges, unitCharges, pmContract, keyContacts] =
    await Promise.all([
      getEffectiveOperatingBudget(orgId),
      db.unit.findMany({ where: { orgId }, select: { id: true, allocationPercent: true } }),
      db.organization.findUnique({
        where: { id: orgId },
        select: { baseCurrency: true, currentExchangeRate: true },
      }),
      getUnitLabel(orgId),
      db.user.findUnique({ where: { id: session.user.id }, select: { rfc: true } }),
      unitIds.length
        ? db.assessmentCharge.findMany({
            where: { unitId: { in: unitIds } },
            include: { assessment: true },
            orderBy: { assessment: { dueDate: "asc" } },
          })
        : Promise.resolve([]),
      unitIds.length
        ? db.unitCharge.findMany({ where: { unitId: { in: unitIds } }, orderBy: { chargedOn: "asc" } })
        : Promise.resolve([]),
      db.pMContract.findFirst({
        where: { orgId, status: "ACTIVE" },
        include: { company: { include: { emergencyContacts: true } } },
        orderBy: { startDate: "desc" },
      }),
      db.keyContact.findMany({ where: { orgId }, orderBy: { sortOrder: "asc" } }),
    ])

  const allocations = effectiveAllocations(orgUnits)
  const rate = org?.currentExchangeRate ?? 17.5
  const base = org?.baseCurrency ?? "USD"
  const toUsd = (amt: number) => (base === "MXN" ? amt / rate : amt)

  const units: OwnerUnitFinance[] = ownerships.map((o) => {
    const pct = allocations.get(o.unitId) ?? 0
    const annual = budget ? budget.totalUsd * (pct / 100) : null

    // Charges grouped by the quarter they fall in, each due at quarter-end.
    const byQuarter = new Map<string, { dueDate: Date; totalUsd: number; paidUsd: number }>()
    for (const c of unitCharges.filter((x) => x.unitId === o.unitId)) {
      const on = new Date(c.chargedOn)
      const q = Math.floor(on.getUTCMonth() / 3) + 1
      const key = `Q${q} ${on.getUTCFullYear()}`
      const slot = byQuarter.get(key) ?? { dueDate: endOfQuarter(on), totalUsd: 0, paidUsd: 0 }
      slot.totalUsd += toUsd(c.amount)
      slot.paidUsd += toUsd(c.amountPaid)
      byQuarter.set(key, slot)
    }
    const quarterlyCharges: QuarterCharge[] = [...byQuarter.entries()]
      .map(([label, v]) => ({ label, ...v }))
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime())

    // Unit Manager (first assignment on this unit) - rich card.
    const asg = o.unit.managers[0]
    const unitManager: UnitManagerCard | null = asg
      ? {
          name: asg.user?.name ?? asg.name ?? asg.user?.email ?? "Unit Manager",
          assignedBy: "Delegated by the owner",
          phone: asg.phone ?? null,
          email: asg.user?.email ?? asg.email ?? null,
          notes: asg.notes ?? null,
          accessCode: o.unit.accessCode ?? null,
          accessCodeNotes: o.unit.accessCodeNotes ?? null,
          areas: asg.grants.map((g) => ({
            label: AREA_LABELS[g.area as UnitManagerArea] ?? g.area,
            level: g.level,
          })),
          canCreateTickets: asg.grants.some((g) => g.area === "TICKETS" && g.level === "MANAGE"),
          unitName: unitDisplayName(unitLabel, o.unit.number, o.unit.building),
        }
      : null

    const cleanerContact = o.unit.contacts.find((c) => c.kind === "CLEANER")
    const cleaner: ContactCard | null = cleanerContact
      ? {
          name: cleanerContact.name,
          phone: cleanerContact.phone,
          email: cleanerContact.email,
          note: cleanerContact.notes,
        }
      : null

    return {
      unitId: o.unitId,
      unitNumber: o.unit.number,
      unitName: unitDisplayName(unitLabel, o.unit.number, o.unit.building),
      ownedSince: o.since,
      civicRoll: o.unit.civicRoll ?? null,
      accessCode: o.unit.accessCode ?? null,
      accessCodeNotes: o.unit.accessCodeNotes ?? null,
      allocationPercent: pct,
      duesFrequency: o.unit.duesFrequency,
      paymentScheduleLabel: SCHEDULE_LABEL[o.unit.duesFrequency],
      annualDuesUsd: annual,
      instalments: budget && annual != null ? duesInstalments(annual, o.unit.duesFrequency, budget.year) : [],
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
      quarterlyCharges,
      unitManager,
      cleaner,
    }
  })

  const anticipatedDuesTotalUsd = units.reduce((s, u) => s + (u.annualDuesUsd ?? 0), 0)
  const anticipatedAssessmentTotalUsd = units.reduce(
    (s, u) => s + u.assessments.filter((a) => a.anticipated).reduce((t, a) => t + a.amountDueUsd, 0),
    0,
  )
  const totalOutstandingUsd = units.reduce(
    (s, u) =>
      s +
      u.assessments
        .filter((a) => !a.anticipated)
        .reduce((t, a) => t + Math.max(a.amountDueUsd - a.amountPaidUsd, 0), 0) +
      u.charges.reduce((t, c) => t + Math.max(c.amountUsd - c.amountPaidUsd, 0), 0),
    0,
  )

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
    ownerRfc: me?.rfc ?? null,
    units,
    totalOutstandingUsd,
    anticipatedDuesTotalUsd,
    anticipatedAssessmentTotalUsd,
    propertyManager,
    security,
  }
}
