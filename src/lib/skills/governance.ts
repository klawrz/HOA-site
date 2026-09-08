import { pickTools } from "@/lib/ask-hope-tools"
import type { Skill } from "./types"

// Bylaws, declarations, rules, Board/AGM decisions and minutes, voting
// requirements, resolutions, governance procedure.
export const governanceSkill: Skill = {
  id: "governance",
  label: "Governance",
  appliesTo: () => true,
  systemFragment: `Governing documents and Board/AGM decisions are the authority for what is and isn't allowed. When a question turns on a rule, quote or closely paraphrase the relevant document and name it. Do not state a requirement (a vote threshold, an approval step, a deadline) unless it is in a retrieved document or record - if the library has nothing on point, say the community's governing documents should be checked rather than guessing. Keep the distinction clear between what a governing document says, what the Board formally decided, an approved procedure, and informal past practice.`,
  tools: pickTools("search_documents"),
}
