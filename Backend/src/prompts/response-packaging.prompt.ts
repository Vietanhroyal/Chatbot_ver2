/**
 * This node is RULE-BASED (no LLM call).
 * This file contains the template/constants used by the
 * response-packaging node for channel-specific formatting.
 *
 * No LLM prompt needed — just export formatting constants.
 */

/** Maximum characters per message bubble */
export const MAX_MESSAGE_LENGTH = 500

/** Default quick replies when no specific ones are provided */
export const DEFAULT_QUICK_REPLIES = ['Tìm hiểu thêm', 'Liên hệ tư vấn viên']

/** Channel-specific formatting rules */
export const CHANNEL_CONFIG = {
  web: {
    supportsQuickReplies: true,
    supportsImages: true,
    maxMessages: 5,
  },
  facebook: {
    supportsQuickReplies: true,
    supportsImages: true,
    maxMessages: 3,
  },
  zalo: {
    supportsQuickReplies: true,
    supportsImages: false,
    maxMessages: 3,
  },
  api: {
    supportsQuickReplies: false,
    supportsImages: false,
    maxMessages: 10,
  },
} as const
