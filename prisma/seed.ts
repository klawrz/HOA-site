import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import bcrypt from "bcryptjs"

const adapter = new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  console.log("Seeding database...")

  const hash = (pw: string) => bcrypt.hash(pw, 12)

  // --- Users ---
  const [owner1, owner2, owner3, renter1, renter2, manager, contractor1, contractor2, board] =
    await Promise.all([
      db.user.upsert({
        where: { email: "owner@sunrise.hoa" },
        update: {},
        create: {
          name: "Margaret Chen",
          email: "owner@sunrise.hoa",
          password: await hash("password123"),
          role: "OWNER",
          phone: "555-201-0001",
        },
      }),
      db.user.upsert({
        where: { email: "owner2@sunrise.hoa" },
        update: {},
        create: {
          name: "David Okafor",
          email: "owner2@sunrise.hoa",
          password: await hash("password123"),
          role: "OWNER",
          phone: "555-201-0002",
        },
      }),
      db.user.upsert({
        where: { email: "owner3@sunrise.hoa" },
        update: {},
        create: {
          name: "Sandra Williams",
          email: "owner3@sunrise.hoa",
          password: await hash("password123"),
          role: "OWNER",
          phone: "555-201-0003",
        },
      }),
      db.user.upsert({
        where: { email: "renter@sunrise.hoa" },
        update: {},
        create: {
          name: "Carlos Rivera",
          email: "renter@sunrise.hoa",
          password: await hash("password123"),
          role: "RENTER",
          phone: "555-301-0001",
        },
      }),
      db.user.upsert({
        where: { email: "renter2@sunrise.hoa" },
        update: {},
        create: {
          name: "Priya Patel",
          email: "renter2@sunrise.hoa",
          password: await hash("password123"),
          role: "RENTER",
          phone: "555-301-0002",
        },
      }),
      db.user.upsert({
        where: { email: "manager@sunrise.hoa" },
        update: {},
        create: {
          name: "Jordan Kim",
          email: "manager@sunrise.hoa",
          password: await hash("password123"),
          role: "PROPERTY_MANAGER",
          phone: "555-100-0001",
        },
      }),
      db.user.upsert({
        where: { email: "contractor@sunrise.hoa" },
        update: {},
        create: {
          name: "Tony Marcello",
          email: "contractor@sunrise.hoa",
          password: await hash("password123"),
          role: "CONTRACTOR",
          phone: "555-400-0001",
          company: "Marcello Plumbing & HVAC",
        },
      }),
      db.user.upsert({
        where: { email: "contractor2@sunrise.hoa" },
        update: {},
        create: {
          name: "Lisa Park",
          email: "contractor2@sunrise.hoa",
          password: await hash("password123"),
          role: "CONTRACTOR",
          phone: "555-400-0002",
          company: "GreenLeaf Landscaping",
        },
      }),
      db.user.upsert({
        where: { email: "board@sunrise.hoa" },
        update: {},
        create: {
          name: "Robert Ashford",
          email: "board@sunrise.hoa",
          password: await hash("password123"),
          role: "BOARD_MEMBER",
          phone: "555-500-0001",
        },
      }),
    ])

  // --- Units ---
  const units = await Promise.all([
    db.unit.upsert({
      where: { number: "1A" },
      update: {},
      create: {
        number: "1A",
        building: "A",
        floor: 1,
        bedrooms: 2,
        bathrooms: 1,
        sqft: 950,
        status: "RENTED",
      },
    }),
    db.unit.upsert({
      where: { number: "1B" },
      update: {},
      create: {
        number: "1B",
        building: "A",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        sqft: 700,
        status: "AVAILABLE",
      },
    }),
    db.unit.upsert({
      where: { number: "2A" },
      update: {},
      create: {
        number: "2A",
        building: "A",
        floor: 2,
        bedrooms: 3,
        bathrooms: 2,
        sqft: 1300,
        status: "RENTED",
      },
    }),
    db.unit.upsert({
      where: { number: "2B" },
      update: {},
      create: {
        number: "2B",
        building: "A",
        floor: 2,
        bedrooms: 2,
        bathrooms: 1.5,
        sqft: 1050,
        status: "OWNER_OCCUPIED",
      },
    }),
    db.unit.upsert({
      where: { number: "3A" },
      update: {},
      create: {
        number: "3A",
        building: "B",
        floor: 1,
        bedrooms: 2,
        bathrooms: 2,
        sqft: 1100,
        status: "AVAILABLE",
      },
    }),
    db.unit.upsert({
      where: { number: "3B" },
      update: {},
      create: {
        number: "3B",
        building: "B",
        floor: 1,
        bedrooms: 1,
        bathrooms: 1,
        sqft: 650,
        status: "UNAVAILABLE",
      },
    }),
  ])

  const [u1A, u1B, u2A, u2B, u3A, u3B] = units

  // --- Ownerships ---
  await Promise.all([
    db.unitOwnership.upsert({
      where: { unitId: u1A.id },
      update: {},
      create: {
        unitId: u1A.id,
        ownerId: owner1.id,
        rentalPolicy: "ANYONE",
        notes: "Prefers 12-month leases",
      },
    }),
    db.unitOwnership.upsert({
      where: { unitId: u1B.id },
      update: {},
      create: {
        unitId: u1B.id,
        ownerId: owner1.id,
        rentalPolicy: "FRIENDS_FAMILY_ONLY",
        notes: "Will consider referrals from existing residents",
      },
    }),
    db.unitOwnership.upsert({
      where: { unitId: u2A.id },
      update: {},
      create: {
        unitId: u2A.id,
        ownerId: owner2.id,
        rentalPolicy: "ANYONE",
        notes: "Contact via email only",
      },
    }),
    db.unitOwnership.upsert({
      where: { unitId: u2B.id },
      update: {},
      create: {
        unitId: u2B.id,
        ownerId: owner2.id,
        rentalPolicy: "NOT_RENTING",
        notes: null,
      },
    }),
    db.unitOwnership.upsert({
      where: { unitId: u3A.id },
      update: {},
      create: {
        unitId: u3A.id,
        ownerId: owner3.id,
        rentalPolicy: "ANYONE",
        notes: null,
      },
    }),
    db.unitOwnership.upsert({
      where: { unitId: u3B.id },
      update: {},
      create: {
        unitId: u3B.id,
        ownerId: owner3.id,
        rentalPolicy: "NOT_RENTING",
        notes: "Under renovation",
      },
    }),
  ])

  // --- Leases ---
  const lease1 = await db.lease.findFirst({ where: { renterId: renter1.id } })
  if (!lease1) {
    await db.lease.create({
      data: {
        unitId: u1A.id,
        renterId: renter1.id,
        startDate: new Date("2024-09-01"),
        endDate: new Date("2025-08-31"),
        monthlyRent: 1850,
        isActive: true,
      },
    })
  }

  const lease2 = await db.lease.findFirst({ where: { renterId: renter2.id } })
  if (!lease2) {
    await db.lease.create({
      data: {
        unitId: u2A.id,
        renterId: renter2.id,
        startDate: new Date("2024-11-01"),
        endDate: new Date("2025-10-31"),
        monthlyRent: 2400,
        isActive: true,
      },
    })
  }

  // --- Trouble Tickets ---
  const t1 = await db.troubleTicket.findFirst({ where: { title: "Leaking kitchen faucet" } })
  if (!t1) {
    const ticket1 = await db.troubleTicket.create({
      data: {
        unitId: u1A.id,
        submittedById: renter1.id,
        title: "Leaking kitchen faucet",
        description: "The faucet has been dripping constantly for 3 days. Water is pooling under the sink.",
        status: "IN_PROGRESS",
        priority: "HIGH",
      },
    })
    await db.ticketAssignment.create({
      data: {
        ticketId: ticket1.id,
        contractorId: contractor1.id,
        notes: "Check supply line and faucet cartridge",
      },
    })
  }

  const t2 = await db.troubleTicket.findFirst({ where: { title: "HVAC not cooling properly" } })
  if (!t2) {
    await db.troubleTicket.create({
      data: {
        unitId: u2A.id,
        submittedById: renter2.id,
        title: "HVAC not cooling properly",
        description: "The AC is running but the unit stays at 80°F even with thermostat set to 68°F.",
        status: "OPEN",
        priority: "URGENT",
      },
    })
  }

  const t3 = await db.troubleTicket.findFirst({ where: { title: "Parking lot light out" } })
  if (!t3) {
    const ticket3 = await db.troubleTicket.create({
      data: {
        unitId: u1A.id,
        submittedById: renter1.id,
        title: "Parking lot light out",
        description: "The light near spots 12-15 has been out for a week creating a safety hazard at night.",
        status: "RESOLVED",
        priority: "MEDIUM",
        resolvedAt: new Date("2025-05-20"),
      },
    })
    await db.ticketAssignment.create({
      data: {
        ticketId: ticket3.id,
        contractorId: contractor1.id,
      },
    })
  }

  // --- Contracts ---
  const c1 = await db.contract.findFirst({ where: { title: "Landscaping & Grounds Maintenance 2025" } })
  if (!c1) {
    await db.contract.create({
      data: {
        title: "Landscaping & Grounds Maintenance 2025",
        contractorId: contractor2.id,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        amount: 18000,
        description: "Monthly lawn care, seasonal plantings, and irrigation system maintenance.",
        status: "ACTIVE",
      },
    })
  }

  const c2 = await db.contract.findFirst({ where: { title: "HVAC & Plumbing Service Agreement" } })
  if (!c2) {
    await db.contract.create({
      data: {
        title: "HVAC & Plumbing Service Agreement",
        contractorId: contractor1.id,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2025-12-31"),
        amount: 24000,
        description: "On-call HVAC and plumbing services, semi-annual inspections included.",
        status: "ACTIVE",
      },
    })
  }

  // --- Meetings ---
  const m1 = await db.meeting.findFirst({ where: { title: "May 2025 Board Meeting" } })
  if (!m1) {
    await db.meeting.create({
      data: {
        title: "May 2025 Board Meeting",
        date: new Date("2025-05-14T18:00:00"),
        location: "Clubhouse Main Hall",
        agenda: "1. Call to order\n2. Approval of April minutes\n3. Budget review Q1\n4. Landscaping contract renewal\n5. New business\n6. Adjournment",
        minutes: "Meeting called to order at 6:07 PM by President Ashford.\n\nApril minutes approved unanimously.\n\nTreasurer reported Q1 reserve fund at $142,000 — on track.\n\nLandscaping contract renewal approved at $18,000 for 2025.\n\nNew business: proposal to repave east parking lot tabled for June.\n\nMeeting adjourned at 7:42 PM.",
        attendees: "Robert Ashford, Linda Tran, Marcus Webb, Dr. Yemi Adeyemi, Sarah Bloom",
      },
    })
  }

  const m2 = await db.meeting.findFirst({ where: { title: "June 2025 Board Meeting" } })
  if (!m2) {
    await db.meeting.create({
      data: {
        title: "June 2025 Board Meeting",
        date: new Date("2025-06-11T18:00:00"),
        location: "Clubhouse Main Hall",
        agenda: "1. Call to order\n2. Approval of May minutes\n3. East parking lot repaving proposal\n4. Reserve study update\n5. Adjournment",
        minutes: null,
        attendees: "All board members",
      },
    })
  }

  // --- Documents ---
  const doc1 = await db.document.findFirst({ where: { title: "HOA Community Rules & Regulations 2025" } })
  if (!doc1) {
    await db.document.create({
      data: {
        title: "HOA Community Rules & Regulations 2025",
        category: "POLICY",
        description: "Current governing rules for all residents",
        content: "1. Quiet hours: 10 PM – 8 AM daily.\n2. No pets over 50 lbs without board approval.\n3. Guests may stay up to 14 consecutive days.\n4. All alterations require prior written board approval.\n5. Parking: one spot per unit; guests use visitor lot.",
        uploadedById: board.id,
      },
    })
  }

  const doc2 = await db.document.findFirst({ where: { title: "2025 Annual Budget" } })
  if (!doc2) {
    await db.document.create({
      data: {
        title: "2025 Annual Budget",
        category: "FINANCIAL",
        description: "Approved annual operating and reserve budget",
        content: "Operating expenses: $156,000\nReserve contributions: $48,000\nLandscaping: $18,000\nHVAC/Plumbing: $24,000\nInsurance: $22,000\nAdmin & misc: $12,000\nTotal: $280,000",
        uploadedById: board.id,
      },
    })
  }

  console.log("Database seeded successfully!")
  console.log("\nDemo credentials (password: password123):")
  console.log("  Owner:            owner@sunrise.hoa")
  console.log("  Renter:           renter@sunrise.hoa")
  console.log("  Property Manager: manager@sunrise.hoa")
  console.log("  Contractor:       contractor@sunrise.hoa")
  console.log("  Board Member:     board@sunrise.hoa")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
