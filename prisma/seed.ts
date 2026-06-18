import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })
const hash = (pw: string) => bcrypt.hash(pw, 12)

async function main() {
  console.log("Seeding database...")

  // --- Org ---
  const org = await db.organization.upsert({
    where: { slug: "sunrise-heights-hoa-demo" },
    update: {},
    create: { name: "Sunrise Heights HOA", slug: "sunrise-heights-hoa-demo", onboardingComplete: true },
  })

  // --- Users ---
  const [accountOwner, owner1, owner2, owner3, renter1, renter2, manager, contractor1, contractor2, board] =
    await Promise.all([
      db.user.upsert({ where: { email: "admin@sunrise.hoa" }, update: {}, create: { name: "Elena Torres", email: "admin@sunrise.hoa", password: await hash("password123"), role: "ACCOUNT_OWNER", orgId: org.id } }),
      db.user.upsert({ where: { email: "owner@sunrise.hoa" }, update: {}, create: { name: "Margaret Chen", email: "owner@sunrise.hoa", password: await hash("password123"), role: "OWNER", orgId: org.id, phone: "555-201-0001" } }),
      db.user.upsert({ where: { email: "owner2@sunrise.hoa" }, update: {}, create: { name: "David Okafor", email: "owner2@sunrise.hoa", password: await hash("password123"), role: "OWNER", orgId: org.id, phone: "555-201-0002" } }),
      db.user.upsert({ where: { email: "owner3@sunrise.hoa" }, update: {}, create: { name: "Sandra Williams", email: "owner3@sunrise.hoa", password: await hash("password123"), role: "OWNER", orgId: org.id, phone: "555-201-0003" } }),
      db.user.upsert({ where: { email: "renter@sunrise.hoa" }, update: {}, create: { name: "Carlos Rivera", email: "renter@sunrise.hoa", password: await hash("password123"), role: "RENTER", orgId: org.id, phone: "555-301-0001" } }),
      db.user.upsert({ where: { email: "renter2@sunrise.hoa" }, update: {}, create: { name: "Priya Patel", email: "renter2@sunrise.hoa", password: await hash("password123"), role: "RENTER", orgId: org.id, phone: "555-301-0002" } }),
      db.user.upsert({ where: { email: "manager@sunrise.hoa" }, update: {}, create: { name: "Jordan Kim", email: "manager@sunrise.hoa", password: await hash("password123"), role: "PROPERTY_MANAGER", orgId: org.id, phone: "555-100-0001" } }),
      db.user.upsert({ where: { email: "contractor@sunrise.hoa" }, update: {}, create: { name: "Tony Marcello", email: "contractor@sunrise.hoa", password: await hash("password123"), role: "CONTRACTOR", orgId: org.id, phone: "555-400-0001", company: "Marcello Plumbing & HVAC" } }),
      db.user.upsert({ where: { email: "contractor2@sunrise.hoa" }, update: {}, create: { name: "Lisa Park", email: "contractor2@sunrise.hoa", password: await hash("password123"), role: "CONTRACTOR", orgId: org.id, phone: "555-400-0002", company: "GreenLeaf Landscaping" } }),
      db.user.upsert({ where: { email: "board@sunrise.hoa" }, update: {}, create: { name: "Robert Ashford", email: "board@sunrise.hoa", password: await hash("password123"), role: "BOARD_MEMBER", orgId: org.id, phone: "555-500-0001" } }),
    ])

  // --- Units ---
  const units = await Promise.all([
    db.unit.upsert({ where: { orgId_number: { orgId: org.id, number: "1A" } }, update: {}, create: { orgId: org.id, number: "1A", building: "A", floor: 1, bedrooms: 2, bathrooms: 1, sqft: 950, status: "RENTED" } }),
    db.unit.upsert({ where: { orgId_number: { orgId: org.id, number: "1B" } }, update: {}, create: { orgId: org.id, number: "1B", building: "A", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 700, status: "AVAILABLE" } }),
    db.unit.upsert({ where: { orgId_number: { orgId: org.id, number: "2A" } }, update: {}, create: { orgId: org.id, number: "2A", building: "A", floor: 2, bedrooms: 3, bathrooms: 2, sqft: 1300, status: "RENTED" } }),
    db.unit.upsert({ where: { orgId_number: { orgId: org.id, number: "2B" } }, update: {}, create: { orgId: org.id, number: "2B", building: "A", floor: 2, bedrooms: 2, bathrooms: 1.5, sqft: 1050, status: "OWNER_OCCUPIED" } }),
    db.unit.upsert({ where: { orgId_number: { orgId: org.id, number: "3A" } }, update: {}, create: { orgId: org.id, number: "3A", building: "B", floor: 1, bedrooms: 2, bathrooms: 2, sqft: 1100, status: "AVAILABLE" } }),
    db.unit.upsert({ where: { orgId_number: { orgId: org.id, number: "3B" } }, update: {}, create: { orgId: org.id, number: "3B", building: "B", floor: 1, bedrooms: 1, bathrooms: 1, sqft: 650, status: "UNAVAILABLE" } }),
  ])
  const [u1A, u1B, u2A, u2B, u3A, u3B] = units

  // --- Ownerships ---
  await Promise.all([
    db.unitOwnership.upsert({ where: { unitId: u1A.id }, update: {}, create: { unitId: u1A.id, ownerId: owner1.id, rentalPolicy: "ANYONE", notes: "Prefers 12-month leases" } }),
    db.unitOwnership.upsert({ where: { unitId: u1B.id }, update: {}, create: { unitId: u1B.id, ownerId: owner1.id, rentalPolicy: "FRIENDS_FAMILY_ONLY" } }),
    db.unitOwnership.upsert({ where: { unitId: u2A.id }, update: {}, create: { unitId: u2A.id, ownerId: owner2.id, rentalPolicy: "ANYONE", notes: "Contact via email" } }),
    db.unitOwnership.upsert({ where: { unitId: u2B.id }, update: {}, create: { unitId: u2B.id, ownerId: owner2.id, rentalPolicy: "NOT_RENTING" } }),
    db.unitOwnership.upsert({ where: { unitId: u3A.id }, update: {}, create: { unitId: u3A.id, ownerId: owner3.id, rentalPolicy: "ANYONE" } }),
    db.unitOwnership.upsert({ where: { unitId: u3B.id }, update: {}, create: { unitId: u3B.id, ownerId: owner3.id, rentalPolicy: "NOT_RENTING", notes: "Under renovation" } }),
  ])

  // --- Leases ---
  if (!await db.lease.findFirst({ where: { renterId: renter1.id } })) {
    await db.lease.create({ data: { unitId: u1A.id, renterId: renter1.id, startDate: new Date("2024-09-01"), endDate: new Date("2025-08-31"), monthlyRent: 1850, isActive: true } })
  }
  if (!await db.lease.findFirst({ where: { renterId: renter2.id } })) {
    await db.lease.create({ data: { unitId: u2A.id, renterId: renter2.id, startDate: new Date("2024-11-01"), endDate: new Date("2025-10-31"), monthlyRent: 2400, isActive: true } })
  }

  // --- Tickets ---
  if (!await db.troubleTicket.findFirst({ where: { title: "Leaking kitchen faucet" } })) {
    const t1 = await db.troubleTicket.create({ data: { orgId: org.id, unitId: u1A.id, submittedById: renter1.id, title: "Leaking kitchen faucet", description: "The faucet has been dripping for 3 days.", status: "IN_PROGRESS", priority: "HIGH" } })
    await db.ticketAssignment.create({ data: { ticketId: t1.id, contractorId: contractor1.id } })
  }
  if (!await db.troubleTicket.findFirst({ where: { title: "HVAC not cooling properly" } })) {
    await db.troubleTicket.create({ data: { orgId: org.id, unitId: u2A.id, submittedById: renter2.id, title: "HVAC not cooling properly", description: "AC running but unit stays at 80°F.", status: "OPEN", priority: "URGENT" } })
  }

  // --- Meetings ---
  if (!await db.meeting.findFirst({ where: { title: "May 2025 Board Meeting" } })) {
    await db.meeting.create({ data: { orgId: org.id, title: "May 2025 Board Meeting", date: new Date("2025-05-14T18:00:00"), location: "Clubhouse Main Hall", agenda: "Budget review, landscaping contract renewal", minutes: "Meeting called to order at 6:07 PM. Landscaping contract approved at $18,000." } })
  }

  // --- Documents ---
  if (!await db.document.findFirst({ where: { title: "HOA Community Rules 2025" } })) {
    await db.document.create({ data: { orgId: org.id, title: "HOA Community Rules 2025", category: "POLICY", description: "Current governing rules", content: "1. Quiet hours 10 PM–8 AM\n2. No pets over 50 lbs\n3. All alterations require board approval", uploadedById: board.id } })
  }

  // --- Contracts ---
  if (!await db.contract.findFirst({ where: { title: "Landscaping 2025" } })) {
    await db.contract.create({ data: { orgId: org.id, title: "Landscaping 2025", contractorId: contractor2.id, startDate: new Date("2025-01-01"), endDate: new Date("2025-12-31"), amount: 18000, status: "ACTIVE" } })
  }

  console.log("\n✓ Seeded successfully!\n")
  console.log("Demo credentials (password: password123):")
  console.log("  Account Owner:    admin@sunrise.hoa")
  console.log("  Unit Owner:       owner@sunrise.hoa")
  console.log("  Renter:           renter@sunrise.hoa")
  console.log("  Property Manager: manager@sunrise.hoa")
  console.log("  Contractor:       contractor@sunrise.hoa")
  console.log("  Board Member:     board@sunrise.hoa")
}

main().catch(console.error).finally(() => db.$disconnect())
