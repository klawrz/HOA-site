import { pickTools } from "@/lib/ask-hope-tools"
import type { AskHopeSession } from "@/lib/ask-hope-queries"
import type { Skill } from "./types"
import { getPropertySituation } from "./property-situation"

function isOwner(s: AskHopeSession) {
  return s.user.role === "OWNER"
}
function isRenter(s: AskHopeSession) {
  return s.user.role === "RENTER"
}
function isBoardOrPm(s: AskHopeSession) {
  return s.user.role === "BOARD_MEMBER" || s.user.role === "PROPERTY_MANAGER" || s.user.isBoardMember
}

// Maintenance history, tickets, inspections, equipment, warranties,
// contractors, work orders, occupancy, capital projects, the PM
// engagement itself.
export const propertySkill: Skill = {
  id: "property",
  label: "Property",
  appliesTo: (s) => isOwner(s) || isRenter(s) || isBoardOrPm(s),
  systemFragment: `For maintenance and property questions, work from tickets, occupancy and contract data. State ticket counts, ages and priorities from the tools, not impressions. If asked what to do about an issue, it's fine to recommend a next step (assign a contractor, open a ticket, follow up with the PM) - but recommending is not doing, and anything that changes a record still happens on the page.`,
  tools: pickTools("get_ticket_status", "get_owner_occupancy_summary", "get_org_ticket_status"),
  getSituation: (session) => getPropertySituation(session),
}
