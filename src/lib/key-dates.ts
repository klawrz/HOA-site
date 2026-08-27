import { db } from "@/lib/db"

// One summary entry for the "Key Dates" block (see key-dates-card.tsx) -
// mixes real KeyDate records (AGM) with derived-not-stored entries (Dues
// due, from Assessment.dueDate) into one sorted list. Dues are computed
// live rather than duplicated into KeyDate, same "derive, don't duplicate"
// reasoning as the reserve fund balance and the capital item due dates.
export type KeyDateEntry = {
  label: string
  date: Date
  href: string
}

// hrefs are supplied by the calling page rather than hardcoded here - this
// same function backs the Key Dates block on Board/PM/Owner pages, each of
// which has its OWN role-scoped route for the AGM page and the Dues &
// Assessments page (same pattern Reserve Fund uses) - a hardcoded Board
// URL would 404/redirect a plain Owner or PM viewing their own page.
export async function getUpcomingKeyDates(
  orgId: string,
  hrefs: { agm: string; dues: string }
): Promise<KeyDateEntry[]> {
  const now = new Date()

  const [agm, duesAssessments] = await Promise.all([
    db.keyDate.findUnique({ where: { orgId_type: { orgId, type: "AGM" } } }),
    db.assessment.findMany({
      where: { orgId, status: "ISSUED", dueDate: { gte: now } },
      orderBy: { dueDate: "asc" },
      take: 3,
    }),
  ])

  const entries: KeyDateEntry[] = []

  if (agm) {
    entries.push({ label: "AGM", date: agm.date, href: hrefs.agm })
  }

  for (const a of duesAssessments) {
    entries.push({ label: `Dues Due - ${a.title}`, date: a.dueDate, href: hrefs.dues })
  }

  return entries.sort((a, b) => a.date.getTime() - b.date.getTime())
}
