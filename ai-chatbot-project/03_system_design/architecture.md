# System Architecture: AI Consulting Chatbot (MVP)

## 1. Document Purpose
This document defines the MVP architecture for the AI reasoning core. It follows the Product Requirements Document (PRD) and MVP scope constraints, focusing on establishing a robust foundation using a NestJS backend, LangGraph orchestration, OpenAI LLMs, and a lightweight Knowledge Base.

## 2. Architecture Principle: Separation of Concerns
The core principle of this MVP architecture is the strict separation between the **Application Layer** and the **AI Reasoning Layer**. This ensures the system is production-ready, scalable, and easy to debug.

* **NestJS (Application Layer):** Acts as the API Gateway. It is *not* the AI agent. Its job is to receive API/Webhook requests, validate payloads, handle system logging, and invoke the LangGraph service.
* **LangGraph (AI Orchestration Layer):** Acts as the "Brain". It is strictly responsible for the multi-step reasoning flow: intent detection, skill routing, retrieval planning, adaptive reasoning, and response packaging.

## 3. MVP Architecture Diagram
*(Placeholder: Insert your architectural flow chart here, e.g., using Mermaid.js or an exported image from draw.io)*
> **[User/Channel]** ➡️ **[NestJS API/Webhook]** ➡️ **[LangGraph Orchestrator]** 🔄 **[Retrieval KB]** & **[LLM]** ➡️ **[Response Packaging]**

## 4. Component Responsibilities

| Component | Responsibility |
| :---                     | :--- |
| **User / Channel Layer** | Serves as the entry point via Website chat or simple API (MVP). *Note: Facebook Messenger and Zalo OA integrations are deferred to Phase 2.* |
| **NestJS Backend Services**| Exposes API endpoints, validates incoming requests, invokes the AI Agent service, manages system logging, and returns the final packaged messages to the client. |
| **LangGraph Agent**        | Orchestrates the stateful AI workflow: Intent Detection ➔ Skill Selection ➔ Retrieval Planning ➔ Adaptive Reasoning ➔ Response Packaging. |
| **Knowledge Base (KB)**    | Stores FAQs, policies, and product documents using JSON, Markdown files, or a lightweight vector database (e.g., Chroma/Milvus) for RAG capabilities. |
| **LLM Provider** | OpenAI (GPT-4o/GPT-4o-mini) is utilized for MVP reasoning and text generation. 
*Self-hosted LLMs can be explored in future phases.* |
| **PostgreSQL (Optional)** | Stores basic system logs, including input/output payloads, detected intents, latency metrics, and evaluation notes for performance tuning. |

## 5. Runtime Data Flow

| Step | Action | Description |
| :---: | :--- | :--- |
| **1** | **User Input** | The user sends a message via the website chat or simple testing API endpoint. |
| **2** | **Validation & Routing** | NestJS receives the request, validates the payload structure, and triggers the LangGraph AI Agent service. |
| **3** | **Agent Orchestration** | LangGraph executes the reasoning graph. It detects the user's intent, selects the appropriate consulting skill, and fetches relevant data from the KB. |
| **4** | **Adaptive Reasoning** | The LLM generates a strategy-aware response based on the retrieved knowledge (choosing between shallow or deep reasoning based on complexity). |
| **5** | **Response Packaging** | The generated answer is split into 2-3 natural, human-like message chunks. |
| **6** | **Output & Logging** | NestJS returns the packaged result to the user interface and asynchronously logs the transaction data to PostgreSQL. |

## 6. Recommended Tech Stack

| Layer | Technology Choice |
| :--- | :--- |
| **Backend Framework** | TypeScript, NestJS |
| **AI Orchestration** | LangGraph (for stateful, multi-agent workflows) |
| **LLM Provider** | OpenAI (for initial release stability) |
| **Knowledge Base** | JSON / Markdown / Lightweight Vector DB |
| **Database** | PostgreSQL (Mainly for MVP logging) |
| **Deployment** | Docker-based containerization for simple production readiness |

## 7. Architecture Rationale (Why this fits the MVP)
* **Focuses on the Moat:** Prioritizes building the core competitive advantage (AI reasoning and consulting skills) rather than commodity integrations.
* **Avoids Premature Complexity:** Excludes CRM, complex seller dashboards, and multi-tenant architectures to ensure rapid delivery.
* **Extensibility:** The decoupled nature of NestJS and LangGraph allows seamless future integration with Facebook, Zalo, CRM, and human-handoff without rewriting the core AI logic.
* **Cost & Token Optimization:** Utilizes adaptive reasoning (Shallow vs. Deep) to prevent running expensive, multi-step LLM calls for simple FAQ queries.

## 8. Development Roadmap & Goals

### First Release Target (Week 1)
**Goal:** Achieve an end-to-end operational AI Reasoning Core. 
**Execution Path:** Input ➔ Intent Detection ➔ Skill Selection ➔ Retrieval ➔ Adaptive Reasoning ➔ Packaged Response ➔ Basic Logging.

### Phase Roadmap
| Phase | Focus Area | Expected Outcome |
| :---: | :--- | :--- |
| **Phase 1** | **Core AI Reasoning** | Functional LangGraph agent, KB retrieval, adaptive reasoning, and response packaging. |
| **Phase 2** | **Channel Integration** | Connect real messaging channels (Facebook Messenger, Zalo OA) once the AI core is stable. |
| **Phase 3** | **CRM Integration** | Add Chatbot On/Off switches, customer state tracking, and seamless seller handoff. |
| **Phase 4** | **Analytics & Dashboard**| Implement monitoring, evaluation metrics, conversion tracking, and admin controls. |