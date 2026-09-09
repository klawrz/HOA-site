import "dotenv/config"
import { PrismaClient, Currency, BudgetCategory, BudgetType, BudgetStatus, ReserveTransactionType, EmployeeStatus, EmployeeGovIdType } from "../src/generated/prisma"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"

// -----------------------------------------------------------------------------
// Real Sampaguita HOA data, kept in code so the financial + roster layer can be
// rebuilt if it is ever lost. This does NOT recreate the organization, its
// units, users or ownerships - it expects the "SampaguitaNEW" org (villas
// numbered 1-14) to already exist, e.g. from a restored dev.db. A full-org loss
// is covered by the dev.db committed in git and the dev.db.backup-* snapshots.
//
// Idempotent: safe to run repeatedly.
//   npx tsx prisma/seed-sampaguita.ts
// -----------------------------------------------------------------------------

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

const ORG_NAME = "SampaguitaNEW"

// Approved dues allocation share per villa (sums to 100.00%). See
// "SampaguitaNEW docs/dues-allocation.md".
const UNIT_ALLOCATIONS: Record<string, number> = {
  "1": 7.89, "2": 7.38, "3": 6.81, "4": 6.81, "5": 6.81, "6": 6.81, "7": 6.81,
  "8": 6.81, "9": 6.81, "10": 6.81, "11": 6.81, "12": 6.81, "13": 7.38, "14": 9.25,
}

// Organization-level financial settings + the Reserve Fund Policy figures
// (Revision 2, frozen 2026-09-09). See "SampaguitaNEW docs/reserve-fund-policy.md".
const ORG_FIELDS = {
  baseCurrency: Currency.MXN,
  currentExchangeRate: 17.5,
  bankSigningAuthority: "wendy only now",
  reserveTarget: 100000,
  reservePolicy:
    "Frozen at Revision 2 (2026-09-09), circulation draft for owner adoption. " +
    "Target USD 100,000 is a placeholder pending an owner motion at the AGM. " +
    "The fund must not fall below 30% of target (USD 30,000) - a breach triggers a special assessment. " +
    "The annual top-up is funded from the operating budget's reserve line and derived from the fund position; FY2027 = USD 8,000 (MXN 140,000). " +
    "The 2027 villa roof (USD 150,000) is funded by 2027-2028 special assessments, not the reserve top-up.",
  reservePolicyRevision: "2",
  reservePolicyStatus: "Circulation draft — pending owner adoption",
  reservePolicyAsOf: "start of 2026",
  reservePolicyBalance: 60000,
  reservePolicyTopUpYears: 5,
  reservePolicyFloorPct: 30,
  reservePolicyExchangeRate: 17.5,
  reservePolicyRoofYear: 2027,
  reservePolicyRoofDrawdown: 150000,
  reservePolicyBudgetYear: 2027,
  reservePolicyBudgetLineUsd: null as number | null,
}

// FY2027 proposed operating budget. Also mirrored, re-importable, in
// "SampaguitaNEW docs/import/fy2027-operating-budget.csv".
const BUDGET = {
  year: 2027,
  periodLabel: "Fiscal 2027",
  version: "Proposed",
  revision: 1,
  status: BudgetStatus.DRAFT,
  type: BudgetType.OPERATING,
  currency: Currency.MXN,
  exchangeRate: 17.5,
  notes:
    "Drafted by HOPE from an uploaded document (Sampaguita exp 2026.pdf) on 2026-09-09. Review every line before approving.\n\n" +
    "Reader's notes: Figures taken in MXN (peso) columns for consistency across the four period columns; the rightmost \"Budget 2026\" column was used as the proposed budget where it provided a value. For lines present in July-December 2026 but blank/zero in Budget 2026 (Accountant, Employees uniforms, SAT ISR), the July-December actual was carried forward since no explicit 2026 budget figure was given. \"Beach concession\" and \"Fire protection\" had partial/zero data across periods; zero or the single available figure was used. The \"Peter reimburse\" line was excluded as a one-off non-operating reimbursement, and totals did not reconcile exactly due to rounding and blank cells in the source table.",
}

type LineItem = {
  label: string
  category: BudgetCategory | null
  budgetedAmount: number
  previousYearActual: number | null
}

const LINE_ITEMS: LineItem[] = [
  { label: "Payroll", category: BudgetCategory.PAYROLL, budgetedAmount: 255500, previousYearActual: 184834 },
  { label: "Security Services", category: BudgetCategory.SECURITY, budgetedAmount: 428750, previousYearActual: 220000 },
  { label: "Payroll tax", category: BudgetCategory.PAYROLL, budgetedAmount: 150502.28, previousYearActual: 11220 },
  { label: "Managment fee", category: BudgetCategory.ADMIN, budgetedAmount: 486500, previousYearActual: 247776 },
  { label: "Bank comission", category: BudgetCategory.ADMIN, budgetedAmount: 26337.5, previousYearActual: 6282 },
  { label: "Property insurance", category: BudgetCategory.INSURANCE, budgetedAmount: 254894.5, previousYearActual: 259000 },
  { label: "Legal fees", category: BudgetCategory.ADMIN, budgetedAmount: 35000, previousYearActual: 21000 },
  { label: "Property taxes", category: BudgetCategory.TAXES_AND_FEES, budgetedAmount: 5250, previousYearActual: 56790 },
  { label: "Fire protection", category: BudgetCategory.MAINTENANCE, budgetedAmount: 10500, previousYearActual: null },
  { label: "Landscaping contract", category: BudgetCategory.GROUNDS, budgetedAmount: 562716, previousYearActual: 244400 },
  { label: "Irrigation system", category: BudgetCategory.GROUNDS, budgetedAmount: 43750, previousYearActual: 20000 },
  { label: "Palm trimming", category: BudgetCategory.GROUNDS, budgetedAmount: 61250, previousYearActual: 0 },
  { label: "Landscaping supplies", category: BudgetCategory.GROUNDS, budgetedAmount: 5250, previousYearActual: 5000 },
  { label: "General repairs", category: BudgetCategory.MAINTENANCE, budgetedAmount: 175000, previousYearActual: 90000 },
  { label: "Beach concession", category: BudgetCategory.TAXES_AND_FEES, budgetedAmount: 87500, previousYearActual: 0 },
  { label: "Pest control", category: BudgetCategory.MAINTENANCE, budgetedAmount: 52500, previousYearActual: 32886 },
  { label: "Villas minor painting", category: BudgetCategory.MAINTENANCE, budgetedAmount: 17500, previousYearActual: 10000 },
  { label: "Main entrance iron door paint", category: BudgetCategory.MAINTENANCE, budgetedAmount: 35000, previousYearActual: 35000 },
  { label: "Garage doors painting", category: BudgetCategory.MAINTENANCE, budgetedAmount: 35000, previousYearActual: 35000 },
  { label: "Equipment & tools", category: BudgetCategory.MAINTENANCE, budgetedAmount: 8750, previousYearActual: 0 },
  { label: "Roof maintenance", category: BudgetCategory.MAINTENANCE, budgetedAmount: 47250, previousYearActual: 47000 },
  { label: "Electricity", category: BudgetCategory.UTILITIES, budgetedAmount: 208827.68, previousYearActual: 85500 },
  { label: "Propane", category: BudgetCategory.UTILITIES, budgetedAmount: 245000, previousYearActual: 156000 },
  { label: "Waste service", category: BudgetCategory.UTILITIES, budgetedAmount: 96465.6, previousYearActual: 45936 },
  { label: "Recycle", category: BudgetCategory.UTILITIES, budgetedAmount: 66291.75, previousYearActual: 3132 },
  { label: "Water", category: BudgetCategory.UTILITIES, budgetedAmount: 665000, previousYearActual: 255000 },
  { label: "Capital exp project", category: BudgetCategory.CAPITAL_EXPENSE, budgetedAmount: 66762.5, previousYearActual: 66762 },
  { label: "Pool maintenance", category: BudgetCategory.GROUNDS, budgetedAmount: 4375, previousYearActual: 80000 },
  { label: "Pool supplies", category: BudgetCategory.GROUNDS, budgetedAmount: 87500, previousYearActual: 4275 },
  { label: "Landscaping lights", category: BudgetCategory.GROUNDS, budgetedAmount: 17500, previousYearActual: 17500 },
  { label: "Reserve", category: BudgetCategory.RESERVE_CONTRIBUTION, budgetedAmount: 175000, previousYearActual: 82464 },
  { label: "Accountant", category: BudgetCategory.ADMIN, budgetedAmount: 34800, previousYearActual: 34800 },
  { label: "Employees uniforms", category: BudgetCategory.PAYROLL, budgetedAmount: 10000, previousYearActual: 10000 },
  { label: "SAT ISR", category: BudgetCategory.PAYROLL, budgetedAmount: 180000, previousYearActual: 180000 },
]

// Reserve fund history - reconstructs the 2025 activity (opening 90k, +60k
// contributions, -90k capital = 60k balance). See section 0.2 of the policy.
const RESERVE_TX = [
  { type: ReserveTransactionType.DEPOSIT, amount: 90000, date: "2024-12-31T00:00:00.000Z", description: "Opening balance carried into 2025 (before the Jan 2025 special assessments)" },
  { type: ReserveTransactionType.DEPOSIT, amount: 60000, date: "2025-06-30T00:00:00.000Z", description: "2025 owner reserve contributions" },
  { type: ReserveTransactionType.WITHDRAWAL, amount: 90000, date: "2025-09-30T00:00:00.000Z", description: "2025 capital: pool furniture 20k, beach concession 20k, villa exterior painting 50k" },
]

// The only assessment on file: the 2027 portion of the villa roof, split
// evenly across all 14 units. USD 75,000 = MXN 1,312,500 at 17.5. See
// Reserve Fund Policy Rev 2, section 0.9.
const ROOF_ASSESSMENT = {
  title: "2027 Villa Roof Replacement",
  type: "SPECIAL" as const,
  status: "DRAFT" as const,
  split: "EVEN" as const,
  totalAmount: 1312500,
  dueDate: "2027-06-01T00:00:00.000Z",
  notes:
    "2027 portion of the USD 150,000 villa roof replacement (USD 75,000 in 2027, USD 75,000 in 2028) per Reserve Fund Policy Rev 2, section 0.9. USD 75,000 = MXN 1,312,500 at 17.5. Split evenly across all 14 units.",
}

const EMPLOYEES = [
  {
    name: "Rosa Delgado",
    employeeNumber: "SAMP-007",
    position: "Head Groundskeeper",
    reportsTo: "Property Manager",
    phone: "+52 624 111 2233",
    email: "rosa.delgado@example.mx",
    homeAddress: "Av. Los Cabos 14, San Jose del Cabo, BCS 23400",
    hireDate: "2024-06-01T00:00:00.000Z",
    status: EmployeeStatus.ON_LEAVE,
    govIds: [
      { type: EmployeeGovIdType.IMSS, value: "1234567890", label: null as string | null },
      { type: EmployeeGovIdType.CURP, value: "DELR900601MBSLRS08", label: null as string | null },
    ],
  },
]

async function main() {
  const org = await db.organization.findFirst({ where: { name: ORG_NAME } })
  if (!org) {
    console.error(`No organization named "${ORG_NAME}" found. Restore dev.db (or a dev.db.backup-*) first, then re-run.`)
    process.exit(1)
  }
  console.log(`Restoring Sampaguita financial + roster data onto org ${org.id} ...`)

  // A member of the org to attribute created rows to (budget, reserve tx).
  const membership = await db.membership.findFirst({ where: { orgId: org.id }, orderBy: { createdAt: "asc" } })
  const seedUserId = membership?.userId ?? null

  // 1. Org financial settings + reserve policy figures
  await db.organization.update({ where: { id: org.id }, data: ORG_FIELDS })

  // 2. Unit dues allocation percentages
  let allocated = 0
  for (const [number, pct] of Object.entries(UNIT_ALLOCATIONS)) {
    const r = await db.unit.updateMany({ where: { orgId: org.id, number }, data: { allocationPercent: pct } })
    allocated += r.count
  }
  console.log(`  allocations set on ${allocated}/14 villas`)

  // 3. FY2027 operating budget (matched by period label) + line items
  const existingBudget = await db.budget.findFirst({
    where: { orgId: org.id, periodLabel: BUDGET.periodLabel, type: BudgetType.OPERATING },
  })
  if (!existingBudget && !seedUserId) {
    console.log("  (skipped budget - it does not exist yet and there is no member to own it)")
  } else {
    const budget = existingBudget
      ? await db.budget.update({ where: { id: existingBudget.id }, data: BUDGET })
      : await db.budget.create({ data: { ...BUDGET, orgId: org.id, createdById: seedUserId! } })
    await db.budgetLineItem.deleteMany({ where: { budgetId: budget.id } })
    await db.budgetLineItem.createMany({
      data: LINE_ITEMS.map((li, i) => ({ ...li, budgetId: budget.id, sortOrder: i })),
    })
    console.log(`  budget "${BUDGET.periodLabel}" with ${LINE_ITEMS.length} line items`)
  }

  // 4. Reserve transactions - only if the history is empty (never duplicate)
  const rtCount = await db.reserveTransaction.count({ where: { orgId: org.id } })
  if (rtCount === 0) {
    if (seedUserId) {
      for (const tx of RESERVE_TX) {
        await db.reserveTransaction.create({
          data: { orgId: org.id, createdById: seedUserId, type: tx.type, amount: tx.amount, date: new Date(tx.date), description: tx.description },
        })
      }
      console.log(`  ${RESERVE_TX.length} reserve transactions`)
    } else {
      console.log("  (skipped reserve transactions - no membership to attribute them to)")
    }
  } else {
    console.log(`  reserve transactions left as-is (${rtCount} already present)`)
  }

  // 5. Employees (matched by name) + government ids
  for (const e of EMPLOYEES) {
    const { govIds, hireDate, ...rest } = e
    const existing = await db.employee.findFirst({ where: { orgId: org.id, name: e.name } })
    const emp = existing
      ? await db.employee.update({ where: { id: existing.id }, data: { ...rest, hireDate: new Date(hireDate) } })
      : await db.employee.create({ data: { ...rest, orgId: org.id, hireDate: new Date(hireDate) } })
    await db.employeeGovId.deleteMany({ where: { employeeId: emp.id } })
    await db.employeeGovId.createMany({ data: govIds.map((g) => ({ ...g, employeeId: emp.id })) })
  }
  console.log(`  ${EMPLOYEES.length} employee record(s)`)

  // 6. The roof assessment (only if it isn't already there and we have units + a member)
  const existingAssessment = await db.assessment.findFirst({
    where: { orgId: org.id, title: ROOF_ASSESSMENT.title },
  })
  if (!existingAssessment && seedUserId) {
    const allUnits = await db.unit.findMany({ where: { orgId: org.id }, select: { id: true } })
    if (allUnits.length > 0) {
      const per = Math.round((ROOF_ASSESSMENT.totalAmount / allUnits.length) * 100) / 100
      await db.assessment.create({
        data: {
          orgId: org.id,
          createdById: seedUserId,
          title: ROOF_ASSESSMENT.title,
          type: ROOF_ASSESSMENT.type,
          status: ROOF_ASSESSMENT.status,
          split: ROOF_ASSESSMENT.split,
          totalAmount: ROOF_ASSESSMENT.totalAmount,
          dueDate: new Date(ROOF_ASSESSMENT.dueDate),
          notes: ROOF_ASSESSMENT.notes,
          charges: { create: allUnits.map((u) => ({ unitId: u.id, amountDue: per })) },
        },
      })
      console.log(`  roof assessment (${allUnits.length} charges of ${per})`)
    }
  } else {
    console.log("  roof assessment left as-is")
  }

  console.log("Done. Sampaguita financial + roster data restored.")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
