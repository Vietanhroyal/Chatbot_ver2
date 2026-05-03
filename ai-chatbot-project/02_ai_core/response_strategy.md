# Adaptive Reasoning & Response Shaping

The final phases of the AI flow (`adaptive_reasoning_node` and `response_strategy_node`) represent the core intelligence of the chatbot. They are distinctly separated into **Content Generation** (The Brain) and **Presentation** (The Presenter).

## 1. Adaptive Reasoning (The Brain)
**Model:** `gpt-5-mini` (Upgrade to `gpt-5` for complex edge cases)

The `adaptive_reasoning_node` is responsible for evaluating the context and generating the **raw content**. It acts as the business logic engine.

**Inputs:** User message, Intent, Selected Skill, Collected Slots, Retrieved Context (RAG), Reasoning Rules.

**Primary Responsibilities:**
1.  **Verification:** Does the retrieved RAG data actually contain the answer?
2.  **Gap Analysis:** Are there missing business rules or slots? (e.g., missing admission method).
3.  **Drafting:** 
    *   If **Complete:** It drafts the factual, core answer.
    *   If **Incomplete:** It drafts the specific follow-up question.

**Example Output (Complete Info):**
```json
{
  "response_type": "final_answer",
  "need_more_info": false,
  "message": "Với ngành CNTT và xét học bạ, em cần đáp ứng tốt nghiệp THPT, chuẩn bị học bạ...",
  "used_chunk_ids": ["admission_2026_01"],
  "risk_level": "medium"
}
```

**Example Output (Missing Info):**
```json
{
  "response_type": "ask_clarification",
  "need_more_info": true,
  "missing_info_fields": ["admission_method"],
  "message": "Để tư vấn chính xác, em muốn xét tuyển theo phương thức nào?",
  "pending_clarification": {
    "type": "missing_info",
    "fields": ["admission_method"]
  }
}
```

## 2. Response Strategy (The Presenter)
**Model:** `gpt-5-mini` or `gpt-5-nano`

The `response_strategy_node` does **not** re-evaluate business logic. It takes the raw `message` from the reasoning node and shapes it for the customer.

**Primary Responsibilities:**
*   Applying the correct persona/tone (e.g., friendly consultant).
*   Adding empathy or acknowledgement.
*   Formatting for the specific channel (Messenger vs Zalo).
*   Splitting long text into natural, multi-message chunks.
*   Adding Call-to-Actions (CTAs) or Quick Replies.

**Example Output:**
```json
{
  "response_type": "final_answer",
  "send_style": "multi_message",
  "messages": [
    {
      "type": "empathy",
      "content": "Dạ, mình hiểu là em đang muốn kiểm tra điều kiện xét học bạ ngành CNTT."
    },
    {
      "type": "main_answer",
      "content": "Với phương thức này, em cần tốt nghiệp THPT hoặc tương đương..."
    },
    {
      "type": "caution_and_cta",
      "content": "Lưu ý tiêu chí có thể thay đổi, em nên đối chiếu đề án mới nhất nhé. Mình có thể hướng dẫn tiếp phần hồ sơ không?"
    }
  ],
  "quick_replies": ["Hồ sơ cần chuẩn bị", "Học phí"]
}
```

## 3. Edge Cases & Clarification Handling
If the `adaptive_reasoning_node` determines information is missing, the flow moves to the `missing_info_strategy_node`.

**Missing Info Strategy Node (Rule/Template):**
This node takes the clarification drafted by the reasoning node and simply standardizes it, attaching predefined quick replies if applicable, before sending it to the packaging node. No large LLM is needed here.
