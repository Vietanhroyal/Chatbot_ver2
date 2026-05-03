How you tightly defined the MVP scope with only 1 main API (`/api/v1/ai/chat`) and 1 secondary API (`/api/v1/health`) really shows a very clear "top-down" mindset – going from the overall picture, cutting out redundant things (Facebook, Zalo, CRM) to focus resources directly on the most valuable core: **AI Reasoning**.

Below is the cleaned Markdown version with script logs removed, structure realigned, JSON/TypeScript code blocks included, and properly formatted tables for you to copy directly into the `api_design_MVP.md` file:

***

```markdown
# API Design: MVP (AI Reasoning Core)

## Document Purpose
This document focuses specifically on the current MVP scope. The system only needs 1 main API to run the AI Reasoning Core (`POST /api/v1/ai/chat`) and 1 secondary API (`GET /api/v1/health`). Facebook/Zalo/CRM/Handoff APIs are planned in the Future APIs section for later expansion.

---

## 1. Core API

### 1.1. Chat Completion API
**Endpoint:** `POST /api/v1/ai/chat`

**Description:**
Receives user messages and returns structured AI responses.
The response includes:
* Detected intent
* Selected skill
* Reasoning level
* Whether more information is needed
* Natural multi-message response (split responses)
* Optional metadata for logging/debugging

### 1.2. Request Body
```json
{
  "session_id": "session_123",
  "user_id": "user_456",
  "channel": "web",
  "message": "Em học lực khá thì nên chọn ngành Công nghệ thông tin hay Khoa học dữ liệu ạ?",
  "context": {
    "user_name": "Ngọc",
    "conversation_history": [
      {
        "role": "user",
        "content": "Em đang quan tâm ngành công nghệ."
      },
      {
        "role": "assistant",
        "content": "Em đang quan tâm nhóm ngành công nghệ đúng không ạ?"
      }
    ]
  }
}
```

### 1.3. Request Fields
| Field | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `session_id` | string | Yes | Conversation/session identifier |
| `user_id` | string | No | User identifier. Can be temporary in MVP |
| `channel` | string | Yes | Message source: `web`, `facebook`, `zalo`, `api` |
| `message` | string | Yes | User message |
| `context` | object | No | Optional user/conversation context |
| `context.user_name` | string | No | User display name |
| `context.conversation_history` | array | No | Recent conversation history |

### 1.4. Response Body
```json
{
  "session_id": "session_123",
  "intent": {
    "name": "major_consultation",
    "confidence": 0.89
  },
  "skill": {
    "name": "career_consulting_skill"
  },
  "reasoning": {
    "level": "deep",
    "need_more_info": true,
    "strategy": "ask_more_and_consult_softly"
  },
  "messages": [
    {
      "type": "text",
      "content": "ad hiểu rồi ạ, hiện tại em đang phân vân giữa Công nghệ thông tin và Khoa học dữ liệu đúng không ạ?"
    },
    {
      "type": "text",
      "content": "Với học lực khá, mình không nên chỉ chọn theo ngành đang hot, mà nên xem thêm nền tảng Toán, khả năng học lập trình và định hướng nghề nghiệp sau này."
    },
    {
      "type": "text",
      "content": "Em cho chị biết thêm là em mạnh hơn về Toán, tiếng Anh hay tư duy logic để chị tư vấn sát hơn nhé."
    }
  ],
  "metadata": {
    "retrieved_sources": [
      {
        "source_id": "faq_major_001",
        "title": "So sánh ngành Công nghệ thông tin và Khoa học dữ liệu"
      }
    ],
    "latency_ms": 1850,
    "model": "gpt-4o-mini"
  }
}
```

### 1.5. Response Fields
| Field | Type | Description |
| :--- | :--- | :--- |
| `session_id` | string | Same session ID from request |
| `intent.name` | string | Detected user intent |
| `intent.confidence` | number | Confidence score |
| `skill.name` | string | Selected consulting skill |
| `reasoning.level` | string | `shallow`, `medium`, or `deep` |
| `reasoning.need_more_info` | boolean | Whether the bot needs more user input |
| `reasoning.strategy` | string | Response strategy selected by AI |
| `messages` | array | Final response split into natural messages |
| `metadata` | object | Debug/logging metadata |

---

## 2. Intent Types
Initial list of Intents for MVP:
* `general_faq`
* `tuition_inquiry`
* `major_inquiry`
* `major_consultation`
* `scholarship_inquiry`
* `admission_method_inquiry`
* `deadline_inquiry`
* `product_inquiry`
* `price_inquiry`
* `objection_or_hesitation`
* `human_support_request`
* `unknown`

---

## 3. Skill Types
Initial list of Skills for MVP:
* `faq_skill`
* `tuition_explanation_skill`
* `major_information_skill`
* `career_consulting_skill`
* `scholarship_advisory_skill`
* `persuasion_skill`
* `human_handoff_skill`
* `fallback_skill`

---

## 4. Reasoning Levels

### 4.1. Shallow Reasoning
Used for factual, simple questions.
* **Examples:** How much is the tuition? What is the registration deadline? How many years does this major take?
* **Typical flow:** Intent detection → Skill selection → KB retrieval → Direct response
* **Expected LLM calls:** 0-1 call

### 4.2. Medium Reasoning
Used for questions needing explanation or comparison.
* **Examples:** How is IT different from Data Science? Is it easy to find a job in this major?
* **Typical flow:** Intent detection → Skill selection → Retrieval → Explain/Suggest
* **Expected LLM calls:** 1 call

### 4.3. Deep Reasoning
Used for complex consulting scenarios.
* **Examples:** I have good grades, average English, and my family wants a major that's easy to find a job in, what should I choose?
* **Typical flow:** Intent detection → Skill selection → Retrieval → Reasoning → Ask follow-up or consult → Response packaging
* **Expected LLM calls:** 1-2 calls in MVP

---

## 5. Error Responses

### 5.1. Validation Error (400 Bad Request)
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "message is required"
  }
}
```

### 5.2. AI Service Error (500 Internal Server Error)
```json
{
  "error": {
    "code": "AI_SERVICE_ERROR",
    "message": "Failed to generate AI response"
  }
}
```

### 5.3. Unsupported Channel (400 Bad Request)
```json
{
  "error": {
    "code": "UNSUPPORTED_CHANNEL",
    "message": "Unsupported channel"
  }
}
```

---

## 6. Basic Health API

### 6.1. Health Check
**Endpoint:** `GET /api/v1/health`

**Response:**
```json
{
  "status": "ok",
  "service": "ai-chatbot-api",
  "timestamp": "2026-04-24T10:00:00.000Z"
}
```

---

## 7. Optional Logging API
In MVP, logging can be handled internally after each `/ai/chat` request.
This optional endpoint is used for debugging (internal/dev environment only):

**Endpoint:** `GET /api/v1/logs/:session_id`

**Response:**
```json
{
  "session_id": "session_123",
  "logs": [
    {
      "message": "Em học lực khá thì nên chọn ngành nào?",
      "intent": "major_consultation",
      "skill": "career_consulting_skill",
      "latency_ms": 1850,
      "created_at": "2026-04-24T10:00:00.000Z"
    }
  ]
}
```

---

## 8. Future APIs
The following APIs are out of scope for MVP but should be considered in subsequent phases.

### 8.1. Facebook Webhook API
`POST /api/v1/webhooks/facebook`
* Receive Facebook message event
* Extract sender ID and message text
* Call `/api/v1/ai/chat`
* Send packaged messages back to Facebook

### 8.2. Zalo Webhook API
`POST /api/v1/webhooks/zalo`
* Receive Zalo OA message event
* Extract user ID and message text
* Call `/api/v1/ai/chat`
* Send packaged messages back to Zalo

### 8.3. CRM Bot Status API
`GET /api/v1/crm/customers/:customer_id/bot-status`
```json
{
  "customer_id": "cus_001",
  "bot_status": "AI_ACTIVE"
}
```

### 8.4. Human Handoff API
`POST /api/v1/conversations/:session_id/handoff`
```json
{
  "reason": "user_requested_human_support",
  "seller_id": "seller_001"
}
```

---

## 9. MVP API Flow
```text
User sends message
        ↓
POST /api/v1/ai/chat
        ↓
Validate request
        ↓
Run LangGraph AI Agent
        ↓
Intent Detection
        ↓
Skill Selection
        ↓
Knowledge Retrieval
        ↓
Adaptive Reasoning
        ↓
Response Packaging
        ↓
Return messages[]
```

---

## 10. NestJS Module Mapping
Directory tree structure for the backend system:

```text
src/
├── app.module.ts
├── health/
│   ├── health.controller.ts
│   └── health.service.ts
├── ai-chat/
│   ├── ai-chat.controller.ts
│   ├── ai-chat.service.ts
│   ├── dto/
│   │   ├── chat-request.dto.ts
│   │   └── chat-response.dto.ts
│   └── ai-chat.module.ts
├── ai-agent/
│   ├── ai-agent.service.ts
│   ├── graph.ts
│   ├── state.ts
│   └── nodes/
│       ├── intent.node.ts
│       ├── skill.node.ts
│       ├── retrieval.node.ts
│       ├── reasoning.node.ts
│       └── packaging.node.ts
├── knowledge-base/
│   ├── knowledge-base.service.ts
│   └── data/
│       ├── admissions.md
│       ├── tuition.md
│       └── faq.json
└── logging/
    └── logging.service.ts
```

---

## 11. DTO Draft

### 11.1. ChatRequestDto
```typescript
export class ChatRequestDto {
  session_id: string;
  user_id?: string;
  channel: "web" | "facebook" | "zalo" | "api";
  message: string;
  context?: {
    user_name?: string;
    conversation_history?: Array<{
      role: "user" | "assistant";
      content: string;
    }>;
  };
}
```

### 11.2. ChatResponseDto
```typescript
export class ChatResponseDto {
  session_id: string;
  intent: {
    name: string;
    confidence: number;
  };
  skill: {
    name: string;
  };
  reasoning: {
    level: "shallow" | "medium" | "deep";
    need_more_info: boolean;
    strategy: string;
  };
  messages: Array<{
    type: "text";
    content: string;
  }>;
  metadata?: {
    retrieved_sources?: Array<{
      source_id: string;
      title: string;
    }>;
    latency_ms?: number;
    model?: string;
  };
}
```

---

## 12. MVP Notes
For the first release, **only the following 2 APIs are required:**
1. `POST /api/v1/ai/chat`
2. `GET /api/v1/health`

Everything else can be developed later. This keeps the MVP fully focused on the product's true "economic moat": **AI Reasoning & Consulting Skill System**.
Channel integration (Facebook, Zalo) and CRM should only be considered as secondary layers built around this AI core.
```