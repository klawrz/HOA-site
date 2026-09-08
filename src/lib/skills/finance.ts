import { pickTools } from "@/lib/ask-hope-tools"
import type { AskHopeSession } from "@/lib/ask-hope-queries"
import type { Skill } from "./types"

function isOwner(s: AskHopeSession) {
  return s.user.role === "OWNER"
}
function isBoardOrPm(s: AskHopeSession) {
  return s.user.role === "BOARD_MEMBER" || s.user.role === "PROPERTY_MANAGER" || s.user.isBoardMember
}

// Budgets, actuals, variances, reserve/capital planning, assessments,
// arrears (permission-bound), financial reporting.
export const financeSkill: Skill = {
  id: "finance",
  label: "Finance",
  appliesTo: (s) => isOwner(s) || isBoardOrPm(s),
  systemFragment: `Never estimate or round a financial figure - report only what a tool returns, and say it is current as of now. Name the record it comes from (an assessment, the operating budget, the reserve ledger). An owner may see their own charges and payments; org-wide collection totals and other owners' arrears are Board/PM only - do not reveal them to an owner even in aggregate if it would identify a unit.`,
  tools: pickTools(
    "get_owner_dues_and_payments",
    "get_owner_financial_summary",
    "get_org_financial_summary",
    "get_org_dues_status"
  ),
}
