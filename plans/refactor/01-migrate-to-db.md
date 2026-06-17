# Refactor Plan 1: Migrate to PostgreSQL Database

## 1. Mục tiêu

Chuyển các thành phần đang hardcode trong source code (prompts, KB, skills) sang lưu trữ trong PostgreSQL. Kết quả:
- Quản lý tập trung qua DB
- Sửa prompt/skill không cần redeploy
- Làm nền tảng cho RAG search

## 2. Phạm vi Migration

| Component | Hiện tại | Bảng DB |
|-----------|----------|---------|
| Skill prompts | `src/prompts/skills/*.prompt.ts` (6 files) | `skills` |
| Core prompts | `src/prompts/*.prompt.ts` (5 files) | `core_prompts` |
| Response strategies | `src/prompts/response-strategy.prompt.ts` | `response_strategies` |
| Knowledge docs | `src/knowledge-base/data/*.md` (4 files) | `documents` (pgvector) |
| FAQ entries | `src/knowledge-base/data/faq.json` | `documents` (type=faq) |

**Giữ nguyên**: `INTENTS`, `SKILLS` constants, API DTOs, LangGraph logic.

## 3. Schema Database

### 3.1 `skills`
```sql
CREATE TABLE skills (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(64) UNIQUE NOT NULL,
  name          VARCHAR(128) NOT NULL,
  description   TEXT,
  system_prompt TEXT NOT NULL,
  enabled       BOOLEAN DEFAULT TRUE,
  version       INT DEFAULT 1,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.2 `core_prompts`
```sql
CREATE TABLE core_prompts (
  id          SERIAL PRIMARY KEY,
  code        VARCHAR(64) UNIQUE NOT NULL,
  content     TEXT NOT NULL,
  description TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 `response_strategies`
```sql
CREATE TABLE response_strategies (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(64) UNIQUE NOT NULL,
  skill_code    VARCHAR(64),
  trigger       TEXT,
  strategy_text TEXT NOT NULL,
  priority      INT DEFAULT 0,
  enabled       BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT fk_skill_code FOREIGN KEY (skill_code) 
    REFERENCES skills(code) ON DELETE SET NULL
);
CREATE INDEX rs_skill_code_idx ON response_strategies(skill_code);
```

### 3.4 `documents` (RAG với pgvector)
```sql
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TABLE documents (
  id          SERIAL PRIMARY KEY,
  type        VARCHAR(32) NOT NULL,
  source      VARCHAR(128),
  content     TEXT NOT NULL,
  metadata    JSONB,
  embedding   VECTOR(1536),
  enabled     BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX documents_embedding_idx ON documents
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX documents_type_idx ON documents(type);
```

## 4. Implementation Steps (chi tiết)

### Step 1: Cài dependencies
```bash
npm install typeorm pg @nestjs/typeorm
npm install -D @types/pg
```

### Step 2: Tạo Database Module
File mới: `Backend/src/database/database.module.ts`
- Đọc config từ `.env`: `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- TypeORM config với autoLoadEntities
- Global module

File mới: `Backend/src/database/data-source.ts`
- DataSource cho TypeORM CLI (migrations)

### Step 3: Tạo entities

**`Backend/src/skills/skills.entity.ts`**
```typescript
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('skills')
export class SkillEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true, length: 64 })
  code: string;

  @Column({ length: 128 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'text', name: 'system_prompt' })
  systemPrompt: string;

  @Column({ default: true })
  enabled: boolean;

  @Column({ default: 1 })
  version: number;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'NOW()' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'NOW()' })
  updatedAt: Date;
}
```

**Tương tự cho**: `core-prompts.entity.ts`, `response-strategies.entity.ts`, `knowledge-base/documents.entity.ts`

### Step 4: Tạo services (với cache)

**`Backend/src/skills/skills.service.ts`**
```typescript
@Injectable()
export class SkillsService {
  private cache = new Map<string, { data: string; version: number; ts: number }>();
  private readonly CACHE_TTL = 60_000; // 60s

  constructor(
    @InjectRepository(SkillEntity)
    private repo: Repository<SkillEntity>,
  ) {}

  async getSystemPrompt(code: string): Promise<string | null> {
    // Check cache
    const cached = this.cache.get(code);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    // Query DB
    const skill = await this.repo.findOne({ where: { code, enabled: true } });
    if (!skill) return null;

    // Update cache
    this.cache.set(code, { 
      data: skill.systemPrompt, 
      version: skill.version, 
      ts: Date.now() 
    });

    return skill.systemPrompt;
  }

  invalidateCache(code?: string) {
    if (code) this.cache.delete(code);
    else this.cache.clear();
  }
}
```

### Step 5: Refactor `getSkillPrompt` → `SkillsService.getSystemPrompt`

**Cũ** (sync function):
```typescript
export function getSkillPrompt(skillName: string): string {
  return SKILL_PROMPT_MAP[skillName] ?? 'Answer based on the knowledge base.';
}
```

**Mới** (async service với fallback):
```typescript
@Injectable()
export class SkillsService {
  async getSystemPrompt(code: string): Promise<string> {
    try {
      const prompt = await this.dbGetSystemPrompt(code);
      if (prompt) return prompt;
    } catch (err) {
      this.logger.warn(`DB read failed for skill ${code}, using fallback`);
    }
    // Fallback to hardcoded
    return HARDCODED_SKILL_MAP[code] ?? 'Answer based on the knowledge base.';
  }
}
```

### Step 6: Refactor các node tương ứng

| File hiện tại | Import cũ | Import mới |
|--------------|-----------|------------|
| `adaptive-reasoning.node.ts` | `getSkillPrompt` (sync) | `SkillsService.getSystemPrompt` (async) |
| `intent-detection.node.ts` | `INTENT_DETECTION_PROMPT` | `CorePromptsService.getByCode('intent_detection')` |
| `response-strategy.node.ts` | `RESPONSE_STRATEGY_PROMPT` | `ResponseStrategiesService.getByIntent(intent)` |
| `clarification-resolution.node.ts` | `CLARIFICATION_RESOLUTION_PROMPT` | `CorePromptsService.getByCode('clarification_resolution')` |
| `response-packaging.node.ts` | hardcoded config | `CorePromptsService.getByCode('response_packaging')` |

### Step 7: Seed script

File mới: `Backend/src/scripts/seed.ts`

```typescript
// Seed skills từ src/prompts/skills/*.prompt.ts
const SKILL_FILES = {
  faq_skill: 'faq.prompt.ts',
  tuition_explanation_skill: 'tuition.prompt.ts',
  // ...
};

for (const [code, file] of Object.entries(SKILL_FILES)) {
  const content = fs.readFileSync(`src/prompts/skills/${file}`, 'utf-8');
  await skillsRepo.upsert(
    { code, name: code, system_prompt: extractPrompt(content) },
    ['code']
  );
}
```

### Step 8: Refactor KnowledgeBaseService (RAG)

**Cũ**: keyword match trong file `.md`/`.json`

**Mới**: vector search
```typescript
async search(query: string, skill?: string): Promise<KnowledgeSearchResult[]> {
  const queryEmbedding = await this.embeddingService.embed(query);
  
  const typeFilter = skill ? this.skillToType(skill) : null;
  
  const results = await this.documentsRepo
    .createQueryBuilder('d')
    .where('d.enabled = :enabled', { enabled: true })
    .andWhere(typeFilter ? 'd.type = :type' : '1=1', { type: typeFilter })
    .orderBy('d.embedding <=> :embedding', 'ASC')
    .setParameter('embedding', queryEmbedding)
    .limit(5)
    .getMany();
  
  return results.map(r => ({
    content: r.content,
    source: r.source,
    relevanceScore: 1 - r.embeddingDistance,
  }));
}
```

### Step 9: Embedding Service

File mới: `Backend/src/knowledge-base/embedding.service.ts`
```typescript
@Injectable()
export class EmbeddingService {
  private embeddings = new OpenAIEmbeddings({
    modelName: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
  });

  async embed(text: string): Promise<number[]> {
    return this.embeddings.embedQuery(text);
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return this.embeddings.embedDocuments(texts);
  }
}
```

## 5. Environment Variables

`.env` đã có:
```bash
DB_HOST=localhost
DB_PORT=5432
DB_USER=myuser
DB_PASSWORD=mypassword
DB_NAME=rag_db
DATABASE_URL=postgresql://myuser:mypassword@localhost:5432/rag_db
EMBEDDING_MODEL=text-embedding-3-small
```

Thêm mới:
```bash
USE_DB_PROMPTS=true        # toggle
USE_RAG_SEARCH=true
RAG_TOP_K=5
EMBEDDING_BATCH_SIZE=10
```

## 6. Migration Commands

```bash
# Generate migration
npm run typeorm migration:generate -- -d src/database/data-source.ts src/database/migrations/Init

# Run migration
npm run typeorm migration:run -- -d src/database/data-source.ts

# Seed data
npm run seed
```

## 7. Backward Compatibility

- Tất cả service interfaces giữ nguyên signature
- Nếu DB fail → tự động fallback hardcode
- Feature flag `USE_DB_PROMPTS=false` → quay về code cũ

## 8. Checklist triển khai

### Phase 1: Setup
- [ ] Cài dependencies (typeorm, pg, @nestjs/typeorm)
- [ ] Tạo `database/` module + config
- [ ] Tạo 4 entities
- [ ] Generate + run migration đầu tiên
- [ ] Verify app vẫn chạy

### Phase 2: Skills + Core Prompts
- [ ] Tạo `SkillsService` với cache
- [ ] Tạo `CorePromptsService` với cache
- [ ] Refactor `getSkillPrompt` → service async
- [ ] Refactor 5 nodes sử dụng prompt
- [ ] Viết seed script cho skills
- [ ] Viết seed script cho core prompts
- [ ] Test fallback khi DB down

### Phase 3: Response Strategies
- [ ] Tạo `ResponseStrategiesService`
- [ ] Seed strategies
- [ ] Refactor `response-strategy.node`

### Phase 4: Knowledge Base RAG
- [ ] Tạo `EmbeddingService`
- [ ] Tạo `DocumentsRepository`
- [ ] Viết seed script cho `.md` files (chunk + embed)
- [ ] Viết seed script cho `faq.json`
- [ ] Refactor `KnowledgeBaseService.search()` dùng vector
- [ ] Test query trả về chunks đúng

### Phase 5: Polish
- [ ] Thêm cache invalidation khi update
- [ ] Health check có DB status
- [ ] Update README
- [ ] Cleanup legacy code

## 9. Risks

| Risk | Mitigation |
|------|------------|
| Migration lỗi | Test local trước, backup DB |
| Seed fail giữa chừng | Idempotent upsert |
| Embedding API tốn cost | Batch 10/request |
| Latency tăng | In-memory cache 60s |

## 10. Definition of Done

- [ ] 4 bảng tạo thành công
- [ ] Seed idempotent, chạy được nhiều lần
- [ ] Tất cả node đọc prompt từ DB thành công
- [ ] Vector search trả về chunks đúng
- [ ] Fallback hoạt động khi DB down
- [ ] Tất cả test cũ pass
- [ ] README cập nhật
