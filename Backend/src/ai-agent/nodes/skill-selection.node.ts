import { AgentState } from '../state';
import { INTENTS, SKILLS } from '../../common/constants';

/**
 * Intent → Skill mapping table.
 * Rule-based, no LLM needed.
 */
const INTENT_TO_SKILL: Record<string, string> = {
  [INTENTS.GENERAL_FAQ]: SKILLS.FAQ,
  [INTENTS.TUITION_INQUIRY]: SKILLS.TUITION,
  [INTENTS.MAJOR_INQUIRY]: SKILLS.MAJOR_INFO,
  [INTENTS.MAJOR_CONSULTATION]: SKILLS.CAREER_CONSULTING,
  [INTENTS.SCHOLARSHIP_INQUIRY]: SKILLS.SCHOLARSHIP,
  [INTENTS.ADMISSION_METHOD_INQUIRY]: SKILLS.FAQ,
  [INTENTS.DEADLINE_INQUIRY]: SKILLS.FAQ,
  [INTENTS.HUMAN_SUPPORT_REQUEST]: SKILLS.HUMAN_HANDOFF,
  [INTENTS.UNKNOWN]: SKILLS.FALLBACK,
};

/**
 * Node 8: Skill Selection (Rule)
 * Maps the detected intent to a specific consulting skill.
 */
export const skillSelectionNode = (
  state: AgentState,
): Partial<AgentState> => {
  const intentName = state.intent?.name ?? INTENTS.UNKNOWN;
  const skill = INTENT_TO_SKILL[intentName] ?? SKILLS.FALLBACK;

  return { selected_skill: skill };
};
