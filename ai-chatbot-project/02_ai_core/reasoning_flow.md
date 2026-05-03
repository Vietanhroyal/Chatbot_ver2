# AI Reasoning Flow (MVP)

## 1. Overview
This document defines the core reasoning flow for the AI chatbot. The architecture is designed to act as a **State Machine** with a **Resume & Resolve** capability, allowing the AI to ask clarification questions and resume context seamlessly. 

To optimize cost and latency, the system heavily relies on rules, templates, and lightweight models (`gpt-5-nano`), reserving deeper reasoning models (`gpt-5-mini` or higher) only for core logic generation.

## 2. Node Classification (3 Groups)
The flow is divided into 3 distinct functional groups to avoid unnecessary LLM calls:

*   **Group 1: Routing / State / Rule:** Handles navigation, guards, and context restoration. Strictly Rule/Regex/Template-based (No LLM).
    *   *Nodes:* `input_guard_node`, `conversation_resume_node`, `continue_previous_task_node`, `skill_selection_node`, `response_packaging_node`.
*   **Group 2: Lightweight Understanding:** Resolves intents and handles clarification responses. Uses Rules with `gpt-5-nano` fallback.
    *   *Nodes:* `intent_detection_node`, `clarification_resolution_node`, `intent_clarification_strategy_node`, `clarification_retry_strategy_node`, `missing_info_strategy_node`, `retrieval_planning_node`.
*   **Group 3: Answer Generation / Response Shaping:** The core "brain" of the chatbot. Uses `gpt-5-mini`.
    *   *Nodes:* `adaptive_reasoning_node`, `response_strategy_node`.

## 3. The Complete Logic Flow

The system operates in two main modes based on whether the AI is waiting for an answer from a previous turn.

### Mode A: Fresh Request (No pending questions)
1.  **Input Guard:** Verify input safety via regex/rules.
2.  **Intent Detection:** Determine the user's goal (`gpt-5-nano`).
    *   *Branch:* If unknown, trigger **Intent Clarification**, use a template to ask the user, and wait.
3.  **Skill Selection:** Rule-based mapping of intent to a specific skill.
4.  **Retrieval Planning:** Generate search queries based on collected slots (`gpt-5-mini` if complex).
5.  **Knowledge Retrieval:** Fetch data from the DB/KB (Vector/Keyword search).
6.  **Adaptive Reasoning:** The core brain (`gpt-5-mini`). It evaluates the RAG data and missing slots.
    *   *Branch:* If crucial information is missing, it drafts a clarification question, triggers **Missing Info Strategy**, and waits.
    *   *Branch:* If enough info exists, it drafts the core factual answer.
7.  **Response Strategy:** Takes the raw drafted answer and applies tone, empathy, and formatting (`gpt-5-nano`/`mini`).
8.  **Response Packaging:** Rule-based formatting into JSON for the specific channel (Zalo/FB).

### Mode B: Resume Mode (User is replying to a clarification question)
1.  **Input Guard:** Verify input safety.
2.  **Conversation Resume Check:** Rule-based check for `pending_clarification` flag in the state.
3.  **Clarification Resolution:** Evaluates the new message against the pending question (`gpt-5-nano`).
    *   **If No (Unresolved):** Trigger **Retry Strategy**. Ask a simpler version of the question.
    *   **If Yes (Resolved):** Clear the pending flag, extract the new slot data, and proceed.
4.  **Continue Path:**
    *   If resolving *Intent*: Go to **Skill Selection**.
    *   If resolving *Missing Info*: Go to **Continue Previous Task** (Rule-based context restoration), then directly to **Retrieval Planning** to continue the interrupted task.
5.  **Standard Completion:** The graph finishes generating the final answer based on the newly gathered data.

## 4. Key Node Responsibilities Redefined

### The Brain: `adaptive_reasoning_node`
Unlike simple bots, this node does **not** just route. It generates the actual raw content.
1. Checks if RAG data is sufficient.
2. Checks if business logic slots are filled.
3. **Outputs:** Either a raw `final_answer` (e.g., "The tuition is $5000.") or an `ask_clarification` (e.g., "Do you want to study IT or Business?").

### The Presenter: `response_strategy_node`
This node does **not** do business logic. It only shapes the message created by `adaptive_reasoning`.
1. Decides if it needs to split into 3 messages.
2. Adds empathy/acknowledgement.
3. Applies tone rules (e.g., "Friendly admission consultant").
