//
export const API_PREFIX = 'api/v1'

//intent
export const INTENTS = {
  GENERAL_FAQ: 'general_faq',
  TUITION_INQUIRY: 'tuition_inquiry',
  MAJOR_INQUIRY: 'major_inquiry',
  MAJOR_CONSULTATION: 'major_consultation',
  SCHOLARSHIP_INQUIRY: 'scholarship_inquiry',
  ADMISSION_METHOD_INQUIRY: 'admission_method_inquiry',
  DEADLINE_INQUIRY: 'deadline_inquiry',
  HUMAN_SUPPORT_REQUEST: 'human_support_request',
  UNKNOWN: 'unknown',
}

//skill
export const SKILLS = {
  FAQ: 'faq_skill',
  TUITION: 'tuition_explanation_skill',
  MAJOR_INFO: 'major_information_skill',
  CAREER_CONSULTING: 'career_consulting_skill',
  SCHOLARSHIP: 'scholarship_advisory_skill',
  HUMAN_HANDOFF: 'human_handoff_skill',
  FALLBACK: 'fallback_skill',
}

//error code
export const ERROR_CODE = {
  AI_SERVICE_ERROR: 500,
}

//input guard
export const INPUT_GUARD = {
  MAX_MESSAGE_LENGTH: 2000,
  MIN_MESSAGE_LENGTH: 1,
}
