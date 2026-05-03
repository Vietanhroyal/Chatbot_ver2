# Intent Detection & Input Guard

## 1. Basic Input Guard
Before processing any intent, the system performs a basic input guard check.
**Goal:** Temporarily block overly long inputs, spam, or basic prompt injection attempts.
*Advanced guardrails (PII masking, toxic content filtering, semantic injection detection) will be implemented in later phases.*

## 2. Intent Detection
The first step of the core agent is to accurately determine what the user is trying to accomplish.

**Core MVP Intents:**
* `tuition_inquiry`: Asking about tuition fees.
* `major_inquiry`: Asking for factual information about a specific major.
* `major_consultation`: Asking for advice or consultation on choosing a major.
* `scholarship_inquiry`: Asking about scholarship opportunities and requirements.
* `human_support_request`: Needing to speak with a real human consultant.
* `general_faq`: General frequently asked questions (e.g., admission deadlines, location).

**Goal:** Correctly categorize the user's text to trigger the appropriate downstream skill execution.
