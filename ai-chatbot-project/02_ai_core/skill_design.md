# Skill Design (Action Routing)

Based on the [Intent Detection](./intent_design.md), the agent routes the conversation to the appropriate specialized skill. Each skill contains specific instructions on how to handle the inquiry.

## MVP Skill Selection

* `faq_skill`: Handles direct entity queries for standard information.
* `tuition_skill`: Specialized handling for pricing and tuition explanations.
* `major_information_skill`: Provides factual details about specific programs/majors.
* `career_consulting_skill`: Engages in multi-turn conversations to help users pick a career path based on their strengths.
* `persuasion_skill`: Handles hesitation or objections (e.g., "The tuition is too high").
* `human_handoff_skill`: Prepares the conversation context to transfer the user to a live agent.
