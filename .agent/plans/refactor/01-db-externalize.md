# Refactor Plan: Externalize KB & Prompts into PostgreSQL

## 1. Context

- DB đã setup ở file `Backend/.env` (PostgreSQL local, port 5432, db name `rag_db`)
- Model embedding: `text-embedding-3-small` (1536 dims)
- Hiện tại KB + prompts đang hardcode trong code

## 2. Mục tiêu

Chuyển sang PostgreSQL để:
- Quản lý KB dạng RAG (vector search thay vì keyword match)
- Quản lý skills/strategies/prompts qua DB, không cần redeploy khi sửa
- Chuẩn hóa service theo hướng production

## 3. Phạm vi Refactor

### 3.1 Đưa vào DB
| Hiện tại | Vị trí | Bảng DB |
|----------|--------|---------|
| Skill prompts | `src/prompts/skills/*.prompt.ts` | `skills` |
| Core prompts (intent, reasoning, strategy, packaging, clarification) | `src/prompts/*.prompt.ts` | `core_prompts` |
| Response strategy | `src/prompts/response-strategy.prompt.ts` | `response_strategies` |
| Knowledge docs | `src/knowledge-base/data/*.md` | `documents` (pgvector) |
| FAQ entries | `src/knowledge-base/data/faq.json` | `documents` (type=faq) |

### 3.2 Giữ nguyên
- `INTENTS`, `SKILLS` constants trong `src/common/constants/`
- LLM orchestration (LangGraph nodes)
- API DTOs

## 4. Schema Database

### 4.1 `skills`
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(64) UNIQUE NOT NULL      -- 'faq_skill', 'tuition_explanation_skill'
name            VARCHAR(128) NOT NULL
description     TEXT
system_prompt   TEXT NOT NULL
enabled         BOOLEAN DEFAULT TRUE
version         INT DEFAULT 1
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### 4.2 `core_prompts`
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(64) UNIQUE NOT NULL      -- 'intent_detection', 'adaptive_reasoning', ...
content         TEXT NOT NULL
description     TEXT
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### 4.3 `response_strategies`
```sql
id              SERIAL PRIMARY KEY
code            VARCHAR(64) UNIQUE NOT NULL      -- 'shallow', 'deep', 'objection_handling'
skill_code      VARCHAR(64)                      -- nullable
trigger         TEXT
strategy_text   TEXT NOT NULL
priority        INT DEFAULT 0
enabled         BOOLEAN DEFAULT TRUE
created_at      TIMESTAMPTZ DEFAULT NOW()
updated_at      TIMESTAMPTZ DEFAULT NOW()
```

### 4.4 `documents` (RAG với pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id            SERIAL PRIMARY KEY,
  type          VARCHAR(32) NOT NULL,            -- 'faq' | 'tuition' | 'majors' | 'scholarship' | 'admissions'
  source        VARCHAR(128),                    -- 'tuition.md#section-2'
  content       TEXT NOT NULL,
  metadata      JSONB,                           -- flexible
  embedding     VECTOR(1536),
  enabled       BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX documents_embedding_idx ON documents
USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

## 5. Cấu trúc Module mới

```
Backend/src/
├── database/                          # NEW
│   ├── database.module.ts             # TypeORM root
│   ├── data-source.ts                 # CLI migrations
│   └── migrations/
│       └── 1700000000000-Init.ts
├── skills/                            # NEW
│   ├── skills.module.ts
│   ├── skills.service.ts
│   └── skills.entity.ts
├── core-prompts/                      # NEW
│   ├── core-prompts.module.ts
│   ├── core-prompts.service.ts
│   └── core-prompts.entity.ts
├── response-strategies/               # NEW
│   ├── response-strategies.module.ts
│   ├── response-strategies.service.ts
│   └── response-strategies.entity.ts
├── knowledge-base/
│   ├── knowledge-base.service.ts      # REFACTOR: vector search
│   ├── knowledge-base.repository.ts   # NEW
│   ├── documents.entity.ts            # NEW
│   ├── embedding.service.ts           # NEW: wrapper OpenAI embedding
│   └── knowledge-base.module.ts
├── ai-agent/nodes/
│   ├── adaptive-reasoning.node.ts     # Sửa: dùng SkillsService
│   ├── response-strategy.node.ts      # Sửa: dùng ResponseStrategiesService
│   ├── intent-detection.node.ts       # Sửa: dùng CorePromptsService
│   ├── clarification-resolution.node.ts
│   └── response-packaging.node.ts
└── scripts/
    └── seed.ts                        # NEW: Seed từ .md/.json/.prompt.ts
```

## 6. Kế hoạch Triển khai

### Sprint 1: Database Foundation (2-3 ngày)
**Mục tiêu**: App chạy được với DB rỗng, không ảnh hưởng code cũ

Tasks:
- [ ] Cài deps: `typeorm`, `pg`, `@nestjs/typeorm`, `@nestjs/config` (đã có)
- [ ] Tạo `database.module.ts` với TypeORM config (đọc từ `.env`)
- [ ] Tạo migration script cho 4 bảng
- [ ] Update `app.module.ts` import DatabaseModule (global)
- [ ] Verify app vẫn chạy bình thường, KB vẫn dùng file cũ

**Verify**: `npm run start:dev` chạy được, test endpoint `/health`

### Sprint 2: Skills & Core Prompts (2-3 ngày)
**Mục tiêu**: Skills + core prompts load từ DB

Tasks:
- [ ] Tạo entities: `Skill`, `CorePrompt`
- [ ] Tạo services với method `getByCode(code)` + in-memory cache (TTL 60s)
- [ ] Viết seed script migrate từ:
  - `src/prompts/skills/*.prompt.ts` → bảng `skills`
  - `src/prompts/*.prompt.ts` → bảng `core_prompts`
- [ ] Refactor `getSkillPrompt` (sync) → `SkillsService.getPrompt(code)` (async)
- [ ] Refactor nodes: `intent-detection`, `adaptive-reasoning`, `clarification-resolution`
- [ ] **Fallback**: nếu DB lỗi/rỗng → dùng hardcode
- [ ] Verify: tất cả test cũ pass

### Sprint 3: Response Strategies (1-2 ngày)
**Mục tiêu**: Strategies quản lý qua DB

Tasks:
- [ ] Tạo entity + service + seed cho `response_strategies`
- [ ] Refactor `response-strategy.node` → dùng `ResponseStrategiesService.getByIntent()`
- [ ] Test persuasion flow, objection handling

### Sprint 4: Knowledge Base RAG (3-4 ngày)
**Mục tiêu**: Vector search thay keyword match

Tasks:
- [ ] Tạo `Document` entity với pgvector column
- [ ] Tạo `EmbeddingService` (wrap `@langchain/openai` Embeddings)
- [ ] Viết seed script:
  - Đọc `admissions.md`, `tuition.md`, `majors.md`, `scholarships.md`
  - Chunk theo heading (##, ###), max 1000 tokens
  - Embed từng chunk → insert vào `documents`
  - Đọc `faq.json` → mỗi entry = 1 chunk
- [ ] Refactor `KnowledgeBaseService.search()`:
  ```typescript
  // CŨ: keyword match trong file
  // MỚI: 
  const queryEmbedding = await embeddingService.embed(query);
  const results = await documentsRepository.findSimilar(queryEmbedding, { 
    limit: 5, 
    type: skill ? skillToType(skill) : undefined 
  });
  ```
- [ ] Fallback: nếu embedding fail → keyword match cũ
- [ ] Unit test cho retrieval flow

**Verify**: Test query "học phí ngành IT" trả về chunk tuition.md

### Sprint 5: Cache & Production Polish (1-2 ngày)
Tasks:
- [ ] In-memory cache cho skills/prompts (TTL 60s hoặc manual invalidate)
- [ ] DB health check trong `/health` endpoint
- [ ] Env var `USE_DB_PROMPTS=true/false` để toggle
- [ ] Cleanup: xóa file `.prompt.ts` không dùng (move vào `legacy/`)
- [ ] Update README với hướng dẫn setup DB + chạy seed
- [ ] Update `architecture.md` với data flow mới

## 7. Backward Compatibility

- Interface `KnowledgeBaseService.search()` giữ nguyên signature
- `INTENTS` / `SKILLS` constants vẫn dùng làm keys
- Nếu DB fail → tự động fallback hardcode (không crash app)
- Feature flag env để rollback nhanh nếu cần

## 8. RAG Flow Chi tiết (Sprint 4)

### Seed time
```
File .md/.json
  → Chunking (theo heading, max 1000 tokens)
  → OpenAI Embedding API (text-embedding-3-small)
  → Insert vào documents table (content + embedding)
```

### Runtime
```
User query
  → Embed query
  → SELECT top-K theo cosine similarity (pgvector)
  → Filter theo type (nếu có skill)
  → Return top 5 chunks làm context
```

## 9. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Embedding API tốn cost khi seed nhiều | Batch 10 chunks/request, log progress |
| Latency tăng khi load prompt từ DB | In-memory cache TTL 60s |
| Seed fail giữa chừng | Idempotent: dùng `ON CONFLICT (code) DO UPDATE` |
| Migration lỗi | Test local trước, dùng transactions |
| App crash khi DB down | Try/catch + fallback hardcode |

## 10. Definition of Done

- [ ] 4 bảng tạo thành công, seed idempotent
- [ ] Skills/strategies/prompts load từ DB với cache
- [ ] KB dùng vector search, test e2e pass
- [ ] Fallback về hardcode hoạt động khi DB down
- [ ] Health check có DB status
- [ ] README cập nhật đầy đủ hướng dẫn
- [ ] Tất cả test cũ pass

## 11. Out of scope (làm sau)

- Admin UI quản lý prompt
- Audit log / version history
- Conversation storage
- Multi-tenant
- A/B testing prompt
