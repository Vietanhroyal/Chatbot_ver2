# Database Architecture

## 1. Tổng quan

PostgreSQL 16+ với extension `pgvector` để lưu trữ:
- **Configuration data**: skills, response strategies, core prompts
- **Knowledge base**: RAG documents với vector embeddings

## 2. ERD (Entity Relationship Diagram)

```
┌─────────────────────┐
│      skills         │
├─────────────────────┤
│ id (PK)             │
│ code (UNIQUE)       │◄──────────┐
│ name                │           │
│ description         │           │
│ system_prompt       │           │
│ enabled             │           │
│ version             │           │
│ created_at          │           │
│ updated_at          │           │
└─────────────────────┘           │
                                  │ (soft FK via code)
┌─────────────────────────┐       │
│  response_strategies    │       │
├─────────────────────────┤       │
│ id (PK)                 │       │
│ code (UNIQUE)           │       │
│ skill_code (FK-like) ───┘───────┘
│ trigger                 │
│ strategy_text           │
│ priority                │
│ enabled                 │
│ created_at              │
│ updated_at              │
└─────────────────────────┘

┌─────────────────────┐
│   core_prompts      │
├─────────────────────┤
│ id (PK)             │
│ code (UNIQUE)       │
│ content             │
│ description         │
│ updated_at          │
└─────────────────────┘

┌─────────────────────────────┐
│       documents             │
├─────────────────────────────┤
│ id (PK)                     │
│ type                        │
│ source                      │
│ content                     │
│ metadata (JSONB)            │
│ embedding (VECTOR 1536)     │
│ enabled                     │
│ created_at                  │
│ updated_at                  │
└─────────────────────────────┘
```

**Lưu ý về relationships:**
- Hiện tại dùng **soft FK** (lưu `code` thay vì `id`) để dễ seed/reload không cần đồng bộ ID
- Có thể nâng cấp thành hard FK sau nếu cần strict referential integrity

## 3. Schema chi tiết

### 3.1 `skills`

Lưu system prompt cho từng skill tư vấn.

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | SERIAL | PK | Auto increment |
| `code` | VARCHAR(64) | UNIQUE, NOT NULL | Key dùng trong code (vd: `faq_skill`) |
| `name` | VARCHAR(128) | NOT NULL | Tên hiển thị (vd: "FAQ Handler") |
| `description` | TEXT | | Mô tả ngắn về skill |
| `system_prompt` | TEXT | NOT NULL | Prompt injection cho LLM |
| `enabled` | BOOLEAN | DEFAULT TRUE | Bật/tắt skill |
| `version` | INT | DEFAULT 1 | Tăng khi update (cho cache invalidation) |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed data ban đầu** (6 skills):
- `faq_skill` → từ `prompts/skills/faq.prompt.ts`
- `tuition_explanation_skill` → từ `prompts/skills/tuition.prompt.ts`
- `major_information_skill` → từ `prompts/skills/major-info.prompt.ts`
- `career_consulting_skill` → từ `prompts/skills/career-consulting.prompt.ts`
- `persuasion_skill` → từ `prompts/skills/persuasion.prompt.ts`
- `human_handoff_skill` → từ `prompts/skills/human-handoff.prompt.ts`

### 3.2 `core_prompts`

Lưu các prompt lõi dùng cho LLM orchestration (không thuộc skill nào).

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(64) | UNIQUE, NOT NULL | `intent_detection`, `adaptive_reasoning`, `response_strategy`, `response_packaging`, `clarification_resolution` |
| `content` | TEXT | NOT NULL | Template prompt, có thể chứa placeholder `{variable}` |
| `description` | TEXT | | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed data ban đầu** (5 prompts):
- `intent_detection` → `prompts/intent-detection.prompt.ts`
- `adaptive_reasoning` → `prompts/reasoning.prompt.ts`
- `response_strategy` → `prompts/response-strategy.prompt.ts`
- `response_packaging` → `prompts/response-packaging.prompt.ts`
- `clarification_resolution` → `prompts/clarification-resolution.prompt.ts`

### 3.3 `response_strategies`

Lưu các chiến lược phản hồi theo tình huống (persuasion, objection, etc.).

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | SERIAL | PK | |
| `code` | VARCHAR(64) | UNIQUE, NOT NULL | `shallow`, `deep`, `objection_handling`, `persuasion` |
| `skill_code` | VARCHAR(64) | NULL | Soft FK → `skills.code`. NULL = global |
| `trigger` | TEXT | | Mô tả khi nào dùng |
| `strategy_text` | TEXT | NOT NULL | Hướng dẫn cho LLM |
| `priority` | INT | DEFAULT 0 | Khi nhiều strategy match → lấy priority cao nhất |
| `enabled` | BOOLEAN | DEFAULT TRUE | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Seed data ban đầu** (3-4 strategies):
- `shallow` (priority 0) → cho câu hỏi đơn giản
- `deep` (priority 1) → cho câu hỏi phức tạp
- `objection_handling` (skill: `persuasion_skill`, priority 2)
- `human_handoff` (skill: `human_handoff_skill`, priority 3)

### 3.4 `documents` (RAG)

Lưu chunks văn bản + vector embedding cho semantic search.

| Column | Type | Constraint | Mô tả |
|--------|------|------------|-------|
| `id` | SERIAL | PK | |
| `type` | VARCHAR(32) | NOT NULL, INDEX | `faq`, `tuition`, `majors`, `scholarship`, `admissions` |
| `source` | VARCHAR(128) | | Tên file gốc (vd: `tuition.md#section-2`) |
| `content` | TEXT | NOT NULL | Nội dung text của chunk |
| `metadata` | JSONB | | Linh hoạt: `{ question, answer, section, ... }` |
| `embedding` | VECTOR(1536) | | Vector từ OpenAI `text-embedding-3-small` |
| `enabled` | BOOLEAN | DEFAULT TRUE | |
| `created_at` | TIMESTAMPTZ | DEFAULT NOW() | |
| `updated_at` | TIMESTAMPTZ | DEFAULT NOW() | |

**Indexes:**
- `documents_embedding_idx`: IVFFlat index trên `embedding` (cosine distance)
- `documents_type_idx`: B-tree trên `type` (filter nhanh theo loại)
- `documents_enabled_idx`: Partial index `WHERE enabled = TRUE`

**Seed data ban đầu** (~20-30 chunks tùy size file):
- `tuition.md` → ~5-7 chunks
- `majors.md` → ~5-7 chunks
- `scholarships.md` → ~3-5 chunks
- `admissions.md` → ~3-5 chunks
- `faq.json` → mỗi entry 1 chunk (~5-10 chunks)

## 4. Relationships tổng thể

```
skills (code) ◄──── soft FK ──── response_strategies (skill_code)
                                          │
                                          │ lookup by intent
                                          ▼
                                   ai-agent runtime
                                          │
                                          │ retrieve context
                                          ▼
                                   documents (vector search)
```

**Runtime lookup pattern:**
1. User gửi message
2. `intent-detection` đọc `core_prompts.code = 'intent_detection'`
3. `adaptive-reasoning` đọc `skills.code = selected_skill`
4. `response-strategy` đọc `response_strategies` theo intent/skill
5. `knowledge-retrieval` query `documents` bằng vector similarity

## 5. Migration Strategy

### Initial migration (1700000000000-Init.ts)
```sql
-- Extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Bảng 1: skills
CREATE TABLE skills (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  name VARCHAR(128) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  enabled BOOLEAN DEFAULT TRUE,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 2: core_prompts
CREATE TABLE core_prompts (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng 3: response_strategies
CREATE TABLE response_strategies (
  id SERIAL PRIMARY KEY,
  code VARCHAR(64) UNIQUE NOT NULL,
  skill_code VARCHAR(64),
  trigger TEXT,
  strategy_text TEXT NOT NULL,
  priority INT DEFAULT 0,
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_skill_code FOREIGN KEY (skill_code) 
    REFERENCES skills(code) ON DELETE SET NULL
);

-- Bảng 4: documents
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  type VARCHAR(32) NOT NULL,
  source VARCHAR(128),
  content TEXT NOT NULL,
  metadata JSONB,
  embedding VECTOR(1536),
  enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX documents_embedding_idx ON documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

CREATE INDEX documents_type_idx ON documents(type);

CREATE INDEX documents_enabled_idx ON documents(enabled) 
  WHERE enabled = TRUE;

CREATE INDEX response_strategies_skill_code_idx 
  ON response_strategies(skill_code);
```

### Seed data (idempotent)
- Dùng `INSERT ... ON CONFLICT (code) DO UPDATE`
- Có thể chạy nhiều lần an toàn
- Log số lượng record inserted/updated

## 6. Environment Variables

Từ `Backend/.env` đã có sẵn:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=rag_db
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/rag_db
EMBEDDING_MODEL=text-embedding-3-small
```

**Thêm vào `.env`** (nếu cần):
```bash
# DB feature flag
USE_DB_PROMPTS=true        # true = load từ DB, false = hardcode fallback
USE_RAG_SEARCH=true        # true = vector search, false = keyword match
EMBEDDING_BATCH_SIZE=10    # Số chunks embed mỗi API call
RAG_TOP_K=5                # Số chunks trả về khi search
```

## 7. Indexing Strategy chi tiết

### IVFFlat parameters
- `lists = 100`: phù hợp với ~10K-100K vectors
- Khi data < 1K vectors: cân nhắc dùng `HNSW` thay (chính xác hơn, build chậm hơn)
- Khi data > 100K: tăng `lists` lên `sqrt(rows)`

### Query optimization
```sql
-- Best practice: filter trước, vector search sau
SELECT id, content, metadata, 
       1 - (embedding <=> $1) AS similarity
FROM documents
WHERE enabled = TRUE 
  AND type = $2
ORDER BY embedding <=> $1
LIMIT $3;
```

## 8. Backup & Maintenance

### Backup
- `pg_dump` cho metadata (skills, prompts, strategies) — chạy hàng ngày
- Backup riêng cho `documents.embedding` (lớn nhất) — chạy tuần

### Cleanup
- Chunk size > 1MB: cảnh báo
- Documents `enabled = FALSE` quá 30 ngày: xóa hẳn
- Embedding NULL: log lỗi seed

### Monitoring queries
```sql
-- Count documents by type
SELECT type, COUNT(*) FROM documents WHERE enabled = TRUE GROUP BY type;

-- Find missing embeddings
SELECT COUNT(*) FROM documents WHERE embedding IS NULL;

-- Skill usage (future)
SELECT skill_code, COUNT(*) FROM response_strategies 
WHERE enabled = TRUE GROUP BY skill_code;
```

## 9. Sơ đồ luồng dữ liệu (Data Flow)

```
┌──────────────┐
│ .prompt.ts   │ (source code ban đầu)
│ .md / .json  │
└──────┬───────┘
       │ seed script
       ▼
┌──────────────────────────────────┐
│         PostgreSQL              │
│  ┌──────────┐  ┌──────────────┐ │
│  │ skills   │  │ core_prompts │ │
│  └──────────┘  └──────────────┘ │
│  ┌──────────┐  ┌──────────────┐ │
│  │response_ │  │  documents   │ │
│  │strategies│  │ (+ vectors)  │ │
│  └──────────┘  └──────────────┘ │
└──────────┬───────────────────────┘
           │ read at runtime
           ▼
┌──────────────────────────────────┐
│      NestJS Application          │
│  ┌────────────┐ ┌─────────────┐ │
│  │ SkillsSvc  │ │CorePrompts  │ │
│  └─────┬──────┘ └──────┬──────┘ │
│        │               │        │
│        ▼               ▼        │
│  ┌─────────────────────────────┐│
│  │     LangGraph Nodes         ││
│  │  - intent detection         ││
│  │  - skill selection          ││
│  │  - knowledge retrieval      ││
│  │  - adaptive reasoning       ││
│  │  - response packaging       ││
│  └─────────────────────────────┘│
└──────────────────────────────────┘
```

## 10. Mở rộng tương lai (Optional)

Các bảng có thể thêm sau:
- `conversations`: lưu history chat
- `analytics_logs`: tracking intent, latency, conversion
- `skill_versions`: audit log mỗi lần edit skill
- `users`: cho multi-tenant
- `feedback`: user feedback cho từng response
