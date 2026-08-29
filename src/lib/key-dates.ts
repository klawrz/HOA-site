import { db } from "@/lib/db"
import { isVisibleToRoles } from "@/lib/audience"
import type { Role } from "@/generated/prisma"

// One summary entry for the "Key Dates" block (see key-dates-card.tsx) -
// mixes real KeyDate records (AGM), derived-not-stored entries (Dues due,
// from Assessment.dueDate), and CustomKeyDate rows (meetings, maintenance,
// inspections, etc.) into one sorted list. Dues are computed live rather
// than duplicated into a stored record, same "derive, don't duplicate"
// reasoning as the reserve fund balance and the capital item due dates.
export type KeyDateEntry = {
  id?: string // present only for CustomKeyDate rows - the only ones deletable from this card
  label: string
  date: Date
  href?: string
  visibleRoles?: string | null // for the manager-only audience badge, same convention as Announcements
}

// hrefs are supplied by the calling page rather than hardcoded here - this
// same function backs the Key Dates block on Board/PM/Owner pages, each of
// which has its OWN role-scoped route for the AGM page and the Dues &
// Assessments page (same pattern Reserve Fund uses) - a hardcoded Board
// URL would 404/redirect a plain Owner or PM viewing their own page.
//
// viewerRoles filters CustomKeyDate entries by audience (see
// src/lib/audience.ts) - AGM and Dues aren't filtered here, since the
// calling page itself is already role-scoped (an Owner's page only ever
// calls this with Owner-appropriate hrefs to begin with).
export async function getUpcomingKeyDates(
  orgId: string,
  hrefs: { agm: string; dues: string },
  viewerRoles: Role[]
): Promise<KeyDateEntry[]> {
  const now = new Date()

  const [agm, duesAssessments, customDates] = await Promise.all([
    db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } }),
    db.assessment.findMany({
      where: { orgId, status: "ISSUED", dueDate: { gte: now } },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
    db.customKeyDate.findMany({
      where: { orgId, date: { gte: now } },
      orderBy: { date: "asc" },
    }),
  ])

  const entries: KeyDateEntry[] = []

  if (agm) {
    entries.push({ label: "AGM", date: agm.date, href: hrefs.agm })
  }

  for (const a of duesAssessments) {
    entries.push({ label: `Dues Due - ${a.title}`, date: a.dueDate, href: hrefs.dues })
  }

  for (const c of customDates) {
    if (!isVisibleToRoles(c.visibleRoles, viewerRoles)) continue
    entries.push({ id: c.id, label: c.title, date: c.date, visibleRoles: c.visibleRoles })
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime())
}
