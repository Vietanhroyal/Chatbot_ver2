import { SKILLS } from '../../common/constants'
import { FAQ_SKILL_INSTRUCTIONS } from './faq.prompt'
import { TUITION_SKILL_INSTRUCTIONS } from './tuition.prompt'
import { MAJOR_INFO_SKILL_INSTRUCTIONS } from './major-info.prompt'
import { CAREER_CONSULTING_SKILL_INSTRUCTIONS } from './career-consulting.prompt'
import { PERSUASION_SKILL_INSTRUCTIONS } from './persuasion.prompt'
import { HUMAN_HANDOFF_SKILL_INSTRUCTIONS } from './human-handoff.prompt'

/**
 * Maps a skill name to its corresponding prompt instructions.
 * Used by the adaptive-reasoning node to inject skill-specific context.
 */
const SKILL_PROMPT_MAP: Record<string, string> = {
  [SKILLS.FAQ]: FAQ_SKILL_INSTRUCTIONS,
  [SKILLS.TUITION]: TUITION_SKILL_INSTRUCTIONS,
  [SKILLS.MAJOR_INFO]: MAJOR_INFO_SKILL_INSTRUCTIONS,
  [SKILLS.CAREER_CONSULTING]: CAREER_CONSULTING_SKILL_INSTRUCTIONS,
  // Note: Persuasion skill might not be in SKILLS constant yet, but we include it
  persuasion_skill: PERSUASION_SKILL_INSTRUCTIONS,
  [SKILLS.HUMAN_HANDOFF]: HUMAN_HANDOFF_SKILL_INSTRUCTIONS,
}

/**
 * Get the skill-specific prompt instructions for a given skill.
 * Returns a fallback instruction if the skill is not found.
 */
export function getSkillPrompt(skillName: string): string {
  return SKILL_PROMPT_MAP[skillName] ?? 'Answer based on the knowledge base.'
}
