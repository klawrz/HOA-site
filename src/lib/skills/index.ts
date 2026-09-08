import type { AskHopeSession } from "@/lib/ask-hope-queries"
import type { AskHopeTool } from "@/lib/ask-hope-tools"
import type { Skill } from "./types"
import { governanceSkill } from "./governance"
import { financeSkill } from "./finance"
import { propertySkill } from "./property"
import { ownerSupportSkill } from "./owner-support"

export type { Skill, SituationRead, SituationSeverity, SituationAction } from "./types"

// The specialist skills behind the ASK HOPE orchestrator. Order here is
// the order their guidance appears in the system prompt.
export const SKILLS: Skill[] = [governanceSkill, financeSkill, propertySkill, ownerSupportSkill]

export function getSkillsForSession(session: AskHopeSession): Skill[] {
  return SKILLS.filter((s) => s.appliesTo(session))
}

export function getSkillById(id: Skill["id"]): Skill | undefined {
  return SKILLS.find((s) => s.id === id)
}

// The deduped, role-filtered tool list ASK HOPE hands to the model - the
// union of every applicable skill's available tools.
export function getSkillToolsForSession(session: AskHopeSession): AskHopeTool[] {
  const seen = new Set<string>()
  const out: AskHopeTool[] = []
  for (const skill of getSkillsForSession(session)) {
    for (const tool of skill.tools) {
      if (tool.isAvailable(session) && !seen.has(tool.name)) {
        seen.add(tool.name)
        out.push(tool)
      }
    }
  }
  return out
}

// The domain-guidance block appended to the ASK HOPE system prompt.
export function getSkillSystemFragments(session: AskHopeSession): string {
  const skills = getSkillsForSession(session)
  if (skills.length === 0) return ""
  return (
    "Specialist areas you cover (route each question to the right one; combine when a question spans more than one):\n\n" +
    skills.map((s) => `### ${s.label}\n${s.systemFragment}`).join("\n\n")
  )
}
