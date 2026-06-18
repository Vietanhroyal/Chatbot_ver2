# Plan 4: Code Review & Fixes for DB Refactor

## 1. Tổng quan

Sau khi 2 agent thực hiện refactor theo các plan trước, mình đã review code hiện tại và phát hiện **nhiều vấn đề nghiêm trọng** cần fix trước khi có thể chạy được.

## 2. Đánh giá tổng quan

### 2.1 Đã làm đúng ✅
- Tạo DatabaseModule + DataSource cho TypeORM
- Tạo 4 entities: `SkillEntity`, `CorePromptEntity`, `DocumentEntity`, `ResponseStrategyEntity`
- TypeORM config đọc từ env, `synchronize: false`
- AppModule import DatabaseModule
- Seed script cho cả 4 bảng
- Có fallback prompts file
- 5 nodes đã refactor: `clarification-resolution`, `intent-detection`, `adaptive-reasoning`, `response-strategy`, `response-packaging`
- Graph đã wire đúng factory pattern

### 2.2 Vấn đề phát hiện ❌

| # | Vấn đề | Mức độ |
|---|--------|--------|
| 1 | **TRÙNG TÊN SERVICE**: Có 2 file `SkillsService` ở 2 vị trí khác nhau | 🔴 CRITICAL |
| 2 | **KB chưa refactor**: `KnowledgeBaseService` vẫn đọc file `.md`/`.json`, không query DB | 🔴 CRITICAL |
| 3 | **`EmbeddingModule` không được import** vào `KnowledgeBaseModule` → DI fail | 🔴 CRITICAL |
| 4 | **`ResponseStrategiesModule` không import** vào `AiAgentModule` | 🟠 HIGH |
| 5 | **`response-strategy.node` không dùng** `ResponseStrategiesService` | 🟠 HIGH |
| 6 | **Document entity dùng `float[]`** thay vì pgvector → không search được | 🟠 HIGH |
| 7 | **Seed không tạo embedding** cho documents → không vector search được | 🟠 HIGH |
| 8 | **Hardcode data trong seed** (CORE_PROMPTS) thay vì đọc từ file | 🟡 MEDIUM |
| 9 | **DatabaseModule không tạo extension `vector`** cho pgvector | 🟡 MEDIUM |
| 10 | **Không có migration scripts** chỉ dùng `synchronize: false` không tạo bảng | 🟡 MEDIUM |

## 3. Chi tiết vấn đề & Cách fix

### Vấn đề #1: TRÙNG TÊN `SkillsService` 🔴

**Hiện trạng**:
- `Backend/src/skills/skills.service.ts` → class `SkillsService`
- `Backend/src/core-prompts/skills.service.ts` → class `SkillsService` (file trùng tên)
- `Backend/src/skills/skills.module.ts` → export `SkillsService` (file 1)
- `Backend/src/core-prompts/core-prompts.module.ts` → KHÔNG export `SkillsService`

**AiAgentModule import**:
```typescript
import { SkillsService } from '../core-prompts/skills.service';  // file 2
```

**Vấn đề**: TypeScript compile được, nhưng `SkillsModule` ở `src/skills/` không được import → không có instance của SkillsService từ file 1, nhưng có 2 class trùng tên trong codebase gây confusion.

**Fix**:
- **Option A (khuyến nghị)**: Xóa `Backend/src/skills/skills.service.ts` và `skills.module.ts`, chỉ giữ 1 instance ở `core-prompts/skills.service.ts`. Đổi tên file thành `skills.service.ts` đã OK rồi.
- **Option B**: Tách rõ thành 2 module riêng biệt với tên khác nhau.

### Vấn đề #2: KB chưa refactor 🔴

**Hiện trạng**: `Backend/src/knowledge-base/knowledge-base.service.ts` vẫn dùng:
- `fs.readFileSync()` để đọc `.md`/`.json`
- Keyword matching cho search
- Switch case dựa trên `SKILLS`

**Fix**: Refactor toàn bộ `search()` method:
```typescript
@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  constructor(
    @InjectRepository(DocumentEntity)
    private documentsRepo: Repository<DocumentEntity>,
    private embeddingService: EmbeddingService,
  ) {}

  async search(query: string, skill?: string): Promise<KnowledgeSearchResult[]> {
    try {
      const queryEmbedding = await this.embeddingService.embed(query);
      const type = this.skillToType(skill);
      
      const qb = this.documentsRepo.createQueryBuilder('d')
        .where('d.enabled = :enabled', { enabled: true });
      
      if (type) {
        qb.andWhere('d.type = :type', { type });
      }
      
      const docs = await qb
        .orderBy('d.embedding <-> :embedding', 'ASC')
        .setParameter('embedding', () => queryEmbedding)
        .limit(5)
        .getMany();
      
      return docs.map(d => ({
        content: d.content,
        source: d.source ?? '',
        relevanceScore: undefined, // sẽ tính ở runtime
      }));
    } catch (err) {
      this.logger.warn(`Vector search failed: ${err}, fallback to empty`);
      return [];
    }
  }
  
  private skillToType(skill?: string): string | null {
    if (!skill) return null;
    const map: Record<string, string> = {
      [SKILLS.TUITION]: 'tuition',
      [SKILLS.MAJOR_INFO]: 'majors',
      [SKILLS.CAREER_CONSULTING]: 'majors',
      [SKILLS.SCHOLARSHIP]: 'scholarships',
      [SKILLS.FAQ]: 'faq',
    };
    return map[skill] ?? null;
  }
  
  onModuleInit() {
    // Xóa loadAllData() cũ, không cần load file nữa
  }
}
```

**Quan trọng**: Phải giữ `OnModuleInit` để tránh break code cũ, nhưng method rỗng.

### Vấn đề #3: EmbeddingModule không được import 🔴

**Hiện trạng**: 
- `Backend/src/knowledge-base/embedding.module.ts` tạo provider `'EMBEDDING_MODEL'`
- `Backend/src/knowledge-base/knowledge-base.module.ts` import `EmbeddingService` nhưng KHÔNG import `EmbeddingModule`

→ Khi `EmbeddingService` inject `'EMBEDDING_MODEL'` → lỗi `Nest can't resolve dependencies`

**Fix**:
```typescript
// Backend/src/knowledge-base/knowledge-base.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { KnowledgeBaseService } from './knowledge-base.service';
import { EmbeddingService } from './embedding.service';
import { EmbeddingModule } from './embedding.module';  // THÊM
import { DocumentEntity } from '../database/entities';

@Module({
  imports: [
    TypeOrmModule.forFeature([DocumentEntity]),
    EmbeddingModule,  // THÊM
  ],
  providers: [KnowledgeBaseService, EmbeddingService],
  exports: [KnowledgeBaseService, EmbeddingService],
})
export class KnowledgeBaseModule {}
```

### Vấn đề #4: ResponseStrategiesModule không import vào AiAgentModule 🟠

**Hiện trạng**: 
- `Backend/src/response-strategies/response-strategies.module.ts` tồn tại
- `Backend/src/ai-agent/ai-agent.module.ts` KHÔNG import nó

→ Service `ResponseStrategiesService` không available trong `AiAgentModule`

**Fix**:
```typescript
// Backend/src/ai-agent/ai-agent.module.ts
import { ResponseStrategiesModule } from '../response-strategies/response-strategies.module';

@Module({
  imports: [
    KnowledgeBaseModule,
    CorePromptsModule,           // THÊM (chứa SkillsService)
    ResponseStrategiesModule,    // THÊM
    TypeOrmModule.forFeature([CorePromptEntity, SkillEntity]),
  ],
  providers: [
    AiAgentService,
    CorePromptsService,
    SkillsService,
    ResponseStrategiesService,  // THÊM
  ],
})
```

### Vấn đề #5: response-strategy.node không dùng ResponseStrategiesService 🟠

**Hiện trạng**: 
- `graph.ts` không pass `responseStrategies` vào factory
- `createResponseStrategyNode` chỉ nhận `corePrompts`, không có `responseStrategies`

**Fix**:
```typescript
// graph.ts
export interface GraphDeps {
  kbService: KnowledgeBaseService;
  corePrompts: CorePromptsService;
  skills: SkillsService;
  responseStrategies: ResponseStrategiesService;  // THÊM
}

// Trong buildAgentGraph:
const responseStrategyNode = createResponseStrategyNode(
  deps.corePrompts, 
  deps.responseStrategies  // THÊM
);
```

```typescript
// response-strategy.node.ts
import { ResponseStrategiesService } from '../../response-strategies/response-strategies.service';

export const createResponseStrategyNode = (
  corePrompts: CorePromptsService,
  responseStrategies: ResponseStrategiesService,  // THÊM
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    // ... existing code
    
    // THÊM: lookup strategy riêng
    const customStrategy = await responseStrategies.getBySkill(
      state.selected_skill ?? ''
    );
    
    const promptTemplate = customStrategy?.strategyText 
      ?? await corePrompts.getByCodeOrFallback('response_strategy', FALLBACK_RESPONSE_STRATEGY_PROMPT);
    
    // ... rest giữ nguyên
  };
};
```

### Vấn đề #6: Document entity dùng `float[]` thay vì pgvector 🟠

**Hiện trạng**:
```typescript
@Column('float', { array: true, nullable: true })
embedding: number[];
```

→ Lưu được nhưng không search được bằng cosine distance. Phải brute-force so sánh trong code.

**Fix**: Dùng pgvector extension
```typescript
@Column({ type: 'vector', length: 1536, nullable: true })
embedding: number[];
```

**Yêu cầu**:
1. PostgreSQL phải cài pgvector extension
2. Phải enable extension trước: `CREATE EXTENSION IF NOT EXISTS vector;`
3. TypeORM phải support (cần thêm `@nestjs/typeorm` version mới hoặc custom type)

**Cách 1 - Dùng custom transformer**:
```typescript
@Column({ type: 'text', nullable: true, transformer: {
  to: (value: number[]) => value ? `[${value.join(',')}]` : null,
  from: (value: string) => value ? value.slice(1, -1).split(',').map(Number) : null,
} })
embedding: number[];
```

**Cách 2 - Dùng raw query** trong repository.

### Vấn đề #7: Seed không tạo embedding 🟠

**Hiện trạng**: `seed.ts` chỉ insert `content` và `metadata`, không embed.

**Fix**: Thêm embedding step:
```typescript
async function seedDocuments(embeddingService: EmbeddingService) {
  const repo = AppDataSource.getRepository(DocumentEntity);
  
  const files = ['admissions.md', 'tuition.md', 'majors.md', 'scholarships.md'];
  
  for (const file of files) {
    const content = fs.readFileSync(path.join(dataDir, file), 'utf-8');
    const chunks = chunkMarkdown(content);  // cần viết hàm chunk
    
    for (const chunk of chunks) {
      const embedding = await embeddingService.embed(chunk.content);
      await repo.upsert({
        type: file.replace('.md', ''),
        source: `${file}#${chunk.id}`,
        content: chunk.content,
        embedding,
        enabled: true,
      }, ['type', 'source']);
    }
  }
}

function chunkMarkdown(content: string): Array<{id: string, content: string}> {
  // Split theo heading ## hoặc \n\n
  // Max 1000 tokens mỗi chunk
  // ...
}
```

### Vấn đề #8: Hardcode data trong seed thay vì đọc từ file 🟡

**Hiện trạng**: `CORE_PROMPTS` trong `seed.ts` chứa prompt string inline dài, không đọc từ `src/prompts/*.prompt.ts`.

**Fix**: Đọc từ file giống `seedSkills()`:
```typescript
const CORE_PROMPT_FILES: Record<string, { file: string; description: string }> = {
  intent_detection: { file: 'intent-detection.prompt.ts', description: '...' },
  clarification_resolution: { file: 'clarification-resolution.prompt.ts', description: '...' },
  reasoning: { file: 'reasoning.prompt.ts', description: '...' },
  response_strategy: { file: 'response-strategy.prompt.ts', description: '...' },
};

for (const [code, { file, description }] of Object.entries(CORE_PROMPT_FILES)) {
  const filePath = path.join(__dirname, '..', 'prompts', file);
  const content = extractPromptFromFile(filePath);
  await repo.upsert({ code, content, description }, ['code']);
}
```

### Vấn đề #9: DatabaseModule không enable vector extension 🟡

**Hiêṇ trạng**: `database.module.ts` không có code để `CREATE EXTENSION IF NOT EXISTS vector;`

**Fix Option A**: Thêm vào migration
```sql
-- migrations/1700000000000-Init.ts
import { MigrationInterface, QueryRunner } from 'typeorm';

export class Init1700000000000 implements MigrationInterface {
  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector;`);
    await queryRunner.query(`CREATE TABLE skills (...)`);
    // ...
  }
  
  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE documents;`);
    // ...
  }
}
```

**Fix Option B**: Chạy thủ công 1 lần: `docker exec -it pg psql -U myuser -d rag_db -c "CREATE EXTENSION vector;"`

### Vấn đề #10: Không có migration scripts 🟡

**Hiện trạng**: `synchronize: false` → TypeORM không tự tạo bảng. Chạy app sẽ lỗi "relation does not exist".

**Fix**: Tạo migration:
```bash
# Generate migration từ entities
npm run typeorm migration:generate -- src/database/migrations/Init

# Hoặc tạo thủ công (xem Vấn đề #9)
```

Sau đó update `package.json`:
```json
"scripts": {
  "migration:run": "typeorm-ts-node-commonjs migration:run -d src/database/data-source.ts",
  "migration:revert": "typeorm-ts-node-commonjs migration:revert -d src/database/data-source.ts",
  "migration:generate": "typeorm-ts-node-commonjs migration:generate -d src/database/data-source.ts",
  "seed": "ts-node src/scripts/seed.ts"
}
```

## 4. Thứ tự fix

### Bước 1: Fix lỗi Critical (chạy được app)
1. Fix vấn đề #1 (trùng tên SkillsService)
2. Fix vấn đề #3 (EmbeddingModule import)
3. Fix vấn đề #4 (ResponseStrategiesModule import)
4. Fix vấn đề #10 (tạo migration)
5. Fix vấn đề #9 (enable vector extension)

### Bước 2: Fix lỗi High
6. Fix vấn đề #5 (response-strategy dùng ResponseStrategiesService)
7. Fix vấn đề #2 (refactor KnowledgeBaseService)
8. Fix vấn đề #6 (pgvector column)
9. Fix vấn đề #7 (seed có embedding)

### Bước 3: Cleanup
10. Fix vấn đề #8 (seed đọc từ file thay vì hardcode)

## 5. Verification checklist

Sau khi fix, chạy thử:
- [ ] `npm run migration:run` → tạo 4 bảng thành công
- [ ] `npm run seed` → seed data thành công, documents có embedding
- [ ] `npm run start:dev` → app start không lỗi
- [ ] Gọi `GET /health` → 200 OK
- [ ] Gọi `POST /api/v1/chat` với "Học phí ngành IT" → trả về response
- [ ] Test với `USE_DB_PROMPTS=false` → fallback cũ hoạt động
- [ ] Test với `USE_DB_PROMPTS=true` → load từ DB
- [ ] Verify vector search trả về chunks đúng từ DB

## 6. Files cần thay đổi

| File | Hành động |
|------|-----------|
| `src/skills/skills.service.ts` | **XÓA** |
| `src/skills/skills.module.ts` | **XÓA** hoặc re-export từ core-prompts |
| `src/knowledge-base/knowledge-base.module.ts` | Import `EmbeddingModule` |
| `src/knowledge-base/knowledge-base.service.ts` | Refactor dùng DB |
| `src/ai-agent/ai-agent.module.ts` | Import `ResponseStrategiesModule` + add provider |
| `src/ai-agent/graph.ts` | Add `responseStrategies` vào GraphDeps |
| `src/ai-agent/nodes/response-strategy.node.ts` | Nhận `responseStrategies` |
| `src/database/entities/document.entity.ts` | Đổi sang `vector(1536)` |
| `src/database/migrations/1700000000000-Init.ts` | **TẠO MỚI** |
| `src/scripts/seed.ts` | Embed documents + đọc từ file |
| `package.json` | Thêm scripts migration |

## 7. Ưu tiên

| Ưu tiên | Vấn đề | Lý do |
|---------|--------|-------|
| P0 | #1, #3, #4, #10 | App không start được |
| P1 | #2, #5, #6, #7 | Core feature RAG không hoạt động |
| P2 | #8, #9 | Code quality |

## 8. Out of scope (làm sau)

- Viết unit test
- Viết e2e test
- Admin UI
- API docs
