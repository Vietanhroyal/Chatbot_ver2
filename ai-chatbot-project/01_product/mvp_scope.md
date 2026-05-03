### **2. mvp_scope.md**

**MVP Objective**
* **Short-term Goal:** Rapidly build and deploy a functional AI chatbot capable of engaging in genuinely intelligent and context-aware conversations with users.

**MVP Scope (Inclusions)**
**1. User Input Handling**
* Simple API / Website chat interface (Facebook/Zalo integration will be deferred).

**2. Intent Detection**
* *Examples:* Inquiring about tuition fees, seeking major/career consultation, or asking general FAQs.

**3. Skill Selection**
* *Examples:* Routing to FAQ skill, Consulting skill, or Persuasion/Sales skill based on detected intent.

**4. Data Retrieval (RAG)**
* **MVP approach:** Utilizing JSON, Markdown files, or a lightweight Vector Database as the Knowledge Base (KB).
* *Note: No CRM integration required at this stage.*

**5. Adaptive Reasoning**
* Simple queries → Trigger **Shallow reasoning**.
* Complex queries → Trigger **Deep reasoning** (Multi-step ReAct loop).

**6. Response Packaging**
* Delivering output as 2-3 segmented, natural-sounding messages to simulate human typing cadence.

**7. Basic Logging**
* Tracking essential metrics: `input`, `output`, `intent`, and `latency`.

**Out of Scope for MVP**
*(To be developed in subsequent phases)*
* CRM Integration
* Seller Dashboard / Admin Panel
* Advanced Analytics
* Advanced Guardrails / Safety filters
* Multi-tenant Architecture

**MVP Tech Stack**
* **Backend:** TypeScript, NestJS
* **AI Orchestration:** LangGraph (for multi-agent state management)
* **LLM Provider:** OpenAI
* **Knowledge Base:** JSON / Markdown KB
* **Database:** PostgreSQL (Optional for MVP, mainly for logging)

**MVP Architecture Flow**
`User` 
↓ 
`API/Webhook` 
↓ 
`NestJS (Backend Services)` 
↓ 
`LangGraph Agent (Orchestrator)` 
↓ 
`Retrieval (KB Search)` 
↓ 
`LLM (Reasoning & Generation)` 
↓ 
`Response (Packaged Messages)`

**MVP Success Criteria**
The MVP will be considered successful if the chatbot achieves the following:
* Provides strictly accurate answers based on the provided KB.
* Proactively asks relevant follow-up questions when data/context is missing.
* Delivers conversational and natural-sounding responses.
* Successfully breaks away from the rigid, script-like interaction of traditional FAQ bots.

**First Release Goals**
* **Week 1 Target:** Achieve an end-to-end operational AI Reasoning Core.
* **Subsequent Phases:** Proceed to connect communication channels (Facebook, Zalo) and integrate the CRM.

> **Strategic Insight:** > For this product, the true competitive moat is **NOT** the channel integration (Facebook/Zalo APIs are commodities). The core value and defensibility lie entirely within the **AI Reasoning & Consulting Skill System**.

***

