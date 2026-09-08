import { pickTools } from "@/lib/ask-hope-tools"
import type { AskHopeSession } from "@/lib/ask-hope-queries"
import type { Skill } from "./types"

// Fees, common questions, renovation/alteration requests, rental & STR
// rules, community procedures, forms, announcements, status of an owner's
// or renter's own requests. No dedicated tools yet - it leans on the
// governance document search and the property ticket tools - but it
// carries the domain framing so ASK HOPE answers these in the right
// register.
export const ownerSupportSkill: Skill = {
  id: "owner-support",
  label: "Owner Support",
  appliesTo: (s: AskHopeSession) => s.user.role === "OWNER" || s.user.role === "RENTER",
  systemFragment: `For "can I / how do I / where do I" questions from an owner or renter, be practical: say whether the thing is generally permitted, whether approval is needed and from whom, and where in HOPE they do it. Ground any rule in a retrieved document. If a request would need Board or PM approval, say so and point to how it's submitted rather than implying it's decided.`,
  tools: pickTools("search_documents"),
}
