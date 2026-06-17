# Refactor Plan 3: Refactor LangGraph Nodes to Use DB Services

## 1. Mục tiêu

Refactor **từng node trong 14 LangGraph nodes** để đọc prompt/KB từ DB thay vì import từ file `.prompt.ts` hoặc đọc file `.md`/`.json`. Đảm bảo:
- Output giống hệt phiên bản cũ
- Có fallback về hardcode nếu DB lỗi
- Test pass sau mỗi bước

## 2. Phạm vi

### 2.1 Nodes cần refactor (10/14 nodes)
| # | Node | Cần đổi |
|---|------|---------|
| 3 | `clarification_resolution_node` | Prompt → `CorePromptsService` |
| 6 | `intent_detection_node` | Prompt → `CorePromptsService` |
| 9 | `retrieval_planning_node` | Prompt (nếu dùng) → `CorePromptsService` |
| 10 | `knowledge_retrieval_node` | KB Service → vector search |
| 11 | `adaptive_reasoning_node` | Prompt + Skill → `CorePromptsService` + `SkillsService` |
| 13 | `response_strategy_node` | Prompt → `ResponseStrategiesService` |
| 14 | `response_packaging_node` | Config → `CorePromptsService` |

### 2.2 Nodes giữ nguyên (4/14 nodes)
| # | Node | Lý do giữ |
|---|------|-----------|
| 1 | `input_guard_node` | Chỉ dùng constants, không có prompt |
| 2 | `conversation_resume_node` | Rule-only, đọc state |
| 4 | `clarification_retry_strategy_node` | Template/Rule |
| 5 | `continue_previous_task_node` | Rule-only |
| 7 | `intent_clarification_strategy_node` | Template/Rule |
| 8 | `skill_selection_node` | Rule-only |
| 12 | `missing_info_strategy_node` | Template/Rule |

## 3. Dependency Injection Strategy

### 3.1 Vấn đề
Hiện tại nodes là **plain functions**:
```typescript
export const intentDetectionNode = async (state) => { ... }
```

Không thể inject service trực tiếp vào function. Có 2 cách:

**Option A: Factory pattern** (đang dùng cho KB)
```typescript
export const createIntentDetectionNode = (corePrompts: CorePromptsService) => {
  return async (state) => { ... }
}
```

**Option B: Node wrapper class** với `@Injectable()`
```typescript
@Injectable()
export class IntentDetectionNode {
  constructor(private corePrompts: CorePromptsService) {}
  
  async invoke(state: AgentState): Promise<Partial<AgentState>> { ... }
}
```

### 3.2 Quyết định: Dùng Factory pattern (nhất quán với KB hiện tại)
- Ít thay đổi graph.ts
- Giữ nguyên cấu trúc plain function
- Dễ test (inject mock)

## 4. Refactor chi tiết từng Node

### Node 3: `clarification_resolution_node`

**File**: `Backend/src/ai-agent/nodes/clarification-resolution.node.ts`

**Trước**:
```typescript
import { CLARIFICATION_RESOLUTION_PROMPT } from '../../prompts';

export const clarificationResolutionNode = async (state) => {
  const prompt = CLARIFICATION_RESOLUTION_PROMPT
    .replace('{user_message}', state.user_message)
    // ...
  // gọi LLM với prompt
};
```

**Sau**:
```typescript
import { CorePromptsService } from '../../core-prompts/core-prompts.service';

export const createClarificationResolutionNode = (
  corePrompts: CorePromptsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const pending = state.pending_clarification;
    if (!pending) return { clarification_resolved: false };

    // Load prompt từ DB với fallback
    const promptTemplate = await corePrompts.getByCodeOrFallback(
      'clarification_resolution',
      FALLBACK_CLARIFICATION_RESOLUTION_PROMPT, // hardcode cũ
    );

    const prompt = promptTemplate
      .replace('{user_message}', state.user_message)
      .replace('{pending_question}', pending.question_asked ?? '')
      .replace('{pending_type}', pending.type)
      .replace('{missing_fields}', (pending.missing_entities ?? []).join(', '));

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
      const response = await llm.invoke(prompt);
      const parsed = JSON.parse(response.content as string);
      return { clarification_resolved: parsed.resolved === true };
    } catch {
      return { clarification_resolved: false };
    }
  };
};
```

**Update graph.ts**:
```typescript
.addNode('clarification_resolution', clarificationResolutionNode)
// đổi thành:
.addNode('clarification_resolution', createClarificationResolutionNode(corePrompts))
```

**Test cases**:
- [ ] User reply giải quyết clarification → `clarification_resolved: true`
- [ ] User reply không giải quyết → `clarification_resolved: false`
- [ ] DB down → dùng fallback hardcode, vẫn hoạt động
- [ ] Output format không đổi

---

### Node 6: `intent_detection_node`

**File**: `Backend/src/ai-agent/nodes/intent-detection.node.ts`

**Trước**:
```typescript
import { INTENT_DETECTION_PROMPT } from '../../prompts';

export const intentDetectionNode = async (state) => {
  const prompt = INTENT_DETECTION_PROMPT
    .replace('{user_message}', state.user_message)
    .replace('{conversation_history}', history);
  // gọi LLM
};
```

**Sau**:
```typescript
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { FALLBACK_INTENT_DETECTION_PROMPT } from './fallback-prompts';

export const createIntentDetectionNode = (
  corePrompts: CorePromptsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const history = state.conversation_history
      .map((m) => `${m.role}: ${m.content}`)
      .join('\n');

    const promptTemplate = await corePrompts.getByCodeOrFallback(
      'intent_detection',
      FALLBACK_INTENT_DETECTION_PROMPT,
    );

    const prompt = promptTemplate
      .replace('{user_message}', state.user_message)
      .replace('{conversation_history}', history || 'None');

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
      const response = await llm.invoke(prompt);
      const parsed = JSON.parse(response.content as string);

      return {
        intent: {
          name: parsed.name || INTENTS.UNKNOWN,
          confidence: parsed.confidence ?? 0,
        },
      };
    } catch {
      return { intent: { name: INTENTS.UNKNOWN, confidence: 0 } };
    }
  };
};
```

**Test cases**:
- [ ] "Học phí bao nhiêu?" → `intent.name = 'tuition_inquiry'`, `confidence >= 0.5`
- [ ] "Cho em gặp tư vấn" → `intent.name = 'human_support_request'`
- [ ] Không rõ ý → `intent.name = 'unknown'`
- [ ] DB down → fallback, vẫn classify đúng

---

### Node 9: `retrieval_planning_node`

**File**: `Backend/src/ai-agent/nodes/retrieval-planning.node.ts`

**Trước** (pure template, không gọi LLM):
```typescript
export const retrievalPlanningNode = (state: AgentState) => {
  const queries: string[] = [];
  queries.push(state.user_message);
  if (state.intent?.name) {
    queries.push(state.intent.name.replace(/_/g, ' '));
  }
  return { retrieval_plan: queries };
};
```

**Sau**:
```typescript
export const retrievalPlanningNode = (
  state: AgentState,
): Partial<AgentState> => {
  const queries: string[] = [];

  // Strategy có thể load từ DB trong tương lai
  queries.push(state.user_message);
  if (state.intent?.name) {
    queries.push(state.intent.name.replace(/_/g, ' '));
  }

  return { retrieval_plan: queries };
};
```

**Lưu ý**: Node này hiện tại là Rule-based, không cần refactor. Nếu sau này muốn dùng LLM để tạo query thông minh hơn, sẽ load prompt từ `core_prompts.code = 'retrieval_planning'`.

**Test cases**:
- [ ] Output `retrieval_plan` là array chứa `user_message` + intent keyword
- [ ] Behavior giống phiên bản cũ 100%

---

### Node 10: `knowledge_retrieval_node` ⚠️ THAY ĐỔI LỚN

**File**: `Backend/src/ai-agent/nodes/knowledge-retrieval.node.ts`

**Trước**: Gọi `kbService.search()` → trả về text content

**Sau**: Vẫn gọi `kbService.search()` nhưng service bên trong đã đổi từ keyword match → vector search.

**Không cần đổi code node**, chỉ cần đảm bảo `KnowledgeBaseService.search()`:
- Trả về cùng format: `KnowledgeSearchResult[]` với `{ content, source }`
- Cùng signature: `search(query, skill?)`
- Có fallback: nếu vector search fail → dùng keyword match cũ

**Test cases** (verify qua e2e):
- [ ] Query "Học phí ngành IT" → retrieved_knowledge chứa content về học phí
- [ ] Query "Các ngành đào tạo" → retrieved_knowledge từ majors.md
- [ ] Skill filter: tuition_skill → chỉ search trong type='tuition'
- [ ] Fallback: vector search fail → dùng keyword match

---

### Node 11: `adaptive_reasoning_node` ⚠️ QUAN TRỌNG NHẤT

**File**: `Backend/src/ai-agent/nodes/adaptive-reasoning.node.ts`

**Trước**:
```typescript
import { ADAPTIVE_REASONING_PROMPT } from '../../prompts';
import { getSkillPrompt } from '../../prompts';

export const adaptiveReasoningNode = async (state) => {
  const skillInstructions = getSkillPrompt(state.selected_skill ?? '');
  const prompt = ADAPTIVE_REASONING_PROMPT
    .replace('{user_message}', state.user_message)
    // ...
    .replace('{skill_instructions}', skillInstructions);
  // gọi LLM
};
```

**Sau**:
```typescript
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { SkillsService } from '../../skills/skills.service';
import { FALLBACK_ADAPTIVE_REASONING_PROMPT, FALLBACK_SKILL_MAP } from './fallback-prompts';

export const createAdaptiveReasoningNode = (
  corePrompts: CorePromptsService,
  skills: SkillsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const history = state.conversation_history
      .map((m: any) => `${m.role}: ${m.content}`)
      .join('\n');

    // Load 2 prompts song song
    const [promptTemplate, skillInstructions] = await Promise.all([
      corePrompts.getByCodeOrFallback('adaptive_reasoning', FALLBACK_ADAPTIVE_REASONING_PROMPT),
      skills.getSystemPromptOrFallback(state.selected_skill ?? '', FALLBACK_SKILL_MAP),
    ]);

    const prompt = promptTemplate
      .replace('{user_message}', state.user_message)
      .replace('{intent}', state.intent?.name ?? 'unknown')
      .replace('{skill}', state.selected_skill ?? 'fallback')
      .replace('{context}', state.retrieved_knowledge ?? 'No context available')
      .replace('{conversation_history}', history || 'None')
      .replace('{skill_instructions}', skillInstructions);

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.3 });
      const response = await llm.invoke(prompt);
      const parsed = JSON.parse(response.content as string);

      return {
        need_more_info: parsed.need_more_info === true,
        reasoning_level: parsed.reasoning_level ?? 'shallow',
        missing_info_fields: parsed.missing_info_fields ?? [],
        response_strategy: parsed.message,
        response_type: parsed.response_type ?? 'final_answer',
      };
    } catch {
      return {
        need_more_info: false,
        reasoning_level: 'shallow',
        response_strategy: 'Xin lỗi, mình gặp lỗi khi xử lý. Vui lòng thử lại.',
        response_type: 'final_answer',
      };
    }
  };
};
```

**Fallback prompts file**: `Backend/src/ai-agent/nodes/fallback-prompts.ts`
```typescript
// Hardcode nội dung prompt cũ để fallback khi DB lỗi
export const FALLBACK_INTENT_DETECTION_PROMPT = `...`;
export const FALLBACK_ADAPTIVE_REASONING_PROMPT = `...`;
export const FALLBACK_SKILL_MAP: Record<string, string> = {
  'faq_skill': '...',
  // ...
};
```

**Test cases**:
- [ ] Skill routing đúng: tuition_skill → load `TUITION_SKILL_INSTRUCTIONS` từ DB
- [ ] Placeholder `{skill_instructions}` được thay thế đúng
- [ ] Output format giống cũ: `need_more_info`, `reasoning_level`, `response_strategy`, `response_type`
- [ ] DB down → fallback, vẫn hoạt động
- [ ] **Critical**: `response_strategy` không rỗng

---

### Node 13: `response_strategy_node`

**File**: `Backend/src/ai-agent/nodes/response-strategy.node.ts`

**Trước**:
```typescript
import { RESPONSE_STRATEGY_PROMPT } from '../../prompts';

export const responseStrategyNode = async (state) => {
  const prompt = RESPONSE_STRATEGY_PROMPT
    .replace('{raw_message}', rawMessage)
    // ...
};
```

**Sau** (dùng `ResponseStrategiesService`):
```typescript
import { ResponseStrategiesService } from '../../response-strategies/response-strategies.service';
import { FALLBACK_RESPONSE_STRATEGY_PROMPT } from './fallback-prompts';

export const createResponseStrategyNode = (
  responseStrategies: ResponseStrategiesService,
  corePrompts: CorePromptsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    const rawMessage = state.response_strategy ?? '';

    // Tìm strategy phù hợp với intent/skill
    const strategy = await responseStrategies.getByIntentAndSkill(
      state.intent?.name ?? 'unknown',
      state.selected_skill ?? undefined,
    );

    // Nếu có strategy riêng → dùng, không thì fallback prompt cũ
    const promptTemplate = strategy?.strategy_text 
      ?? await corePrompts.getByCodeOrFallback('response_strategy', FALLBACK_RESPONSE_STRATEGY_PROMPT);

    const prompt = promptTemplate
      .replace('{raw_message}', rawMessage)
      .replace('{intent}', state.intent?.name ?? 'unknown')
      .replace('{response_type}', state.response_type)
      .replace('{channel}', 'web');

    try {
      const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0.5 });
      const response = await llm.invoke(prompt);
      const parsed = JSON.parse(response.content as string);

      const messages = (parsed.messages ?? []).map(
        (m: { type: string; content: string }) => ({
          type: 'text' as const,
          content: m.content,
        }),
      );

      return {
        final_messages: messages.length > 0
          ? messages
          : [{ type: 'text', content: rawMessage }],
      };
    } catch {
      return {
        final_messages: [{ type: 'text', content: rawMessage }],
      };
    }
  };
};
```

**Test cases**:
- [ ] Output `final_messages` array giống cũ
- [ ] Persuasion intent → load strategy riêng từ DB
- [ ] Fallback: strategy không tồn tại → dùng prompt cũ
- [ ] DB down → fallback prompt cũ

---

### Node 14: `response_packaging_node`

**File**: `Backend/src/ai-agent/nodes/response-packaging.node.ts`

**Trước**: Hardcoded config + fallback

**Sau**:
```typescript
import { CorePromptsService } from '../../core-prompts/core-prompts.service';
import { FALLBACK_PACKAGING_CONFIG } from './fallback-prompts';

export const createResponsePackagingNode = (
  corePrompts: CorePromptsService,
) => {
  return async (state: AgentState): Promise<Partial<AgentState>> => {
    if (state.final_messages && state.final_messages.length > 0) {
      return {};
    }

    if (state.response_strategy) {
      // Load config từ DB để check max length
      const config = await corePrompts.getConfigByCodeOrFallback(
        'response_packaging',
        FALLBACK_PACKAGING_CONFIG,
      );
      
      let content = state.response_strategy;
      if (content.length > config.maxMessageLength) {
        content = content.substring(0, config.maxMessageLength) + '...';
      }
      
      return {
        final_messages: [{ type: 'text', content }],
      };
    }

    return {
      final_messages: [{
        type: 'text',
        content: 'Xin lỗi, mình chưa thể trả lời câu hỏi này. Vui lòng thử lại.',
      }],
    };
  };
};
```

**Test cases**:
- [ ] Response quá dài → truncate theo config
- [ ] Fallback config giống hardcode cũ (MAX_MESSAGE_LENGTH = 1600)
- [ ] Empty messages → safety net message

---

## 5. Service Layer Updates

### 5.1 `CorePromptsService.getByCodeOrFallback`

```typescript
@Injectable()
export class CorePromptsService {
  private cache = new Map<string, { content: string; ts: number }>();
  private readonly CACHE_TTL = 60_000;

  constructor(
    @InjectRepository(CorePromptEntity)
    private repo: Repository<CorePromptEntity>,
  ) {}

  /**
   * Get prompt by code, fallback to hardcoded if DB fails.
   * CRITICAL: This is the main method used by nodes.
   */
  async getByCodeOrFallback(
    code: string, 
    fallback: string,
  ): Promise<string> {
    try {
      const cached = this.cache.get(code);
      if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
        return cached.content;
      }

      const entity = await this.repo.findOne({ 
        where: { code },
        // No `enabled` filter - always load for fallback safety
      });
      
      if (entity?.content) {
        this.cache.set(code, { content: entity.content, ts: Date.now() });
        return entity.content;
      }
    } catch (err) {
      this.logger.warn(`DB read failed for core_prompts[${code}], using fallback`, err);
    }
    
    // Fallback to hardcoded
    return fallback;
  }

  invalidateCache(code?: string) {
    if (code) this.cache.delete(code);
    else this.cache.clear();
  }
}
```

### 5.2 `SkillsService.getSystemPromptOrFallback`

```typescript
@Injectable()
export class SkillsService {
  private cache = new Map<string, { prompt: string; version: number; ts: number }>();
  private readonly CACHE_TTL = 60_000;

  constructor(
    @InjectRepository(SkillEntity)
    private repo: Repository<SkillEntity>,
  ) {}

  async getSystemPromptOrFallback(
    code: string,
    fallbackMap: Record<string, string>,
  ): Promise<string> {
    try {
      const cached = this.cache.get(code);
      if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
        return cached.prompt;
      }

      const skill = await this.repo.findOne({ 
        where: { code, enabled: true } 
      });
      
      if (skill?.systemPrompt) {
        this.cache.set(code, { 
          prompt: skill.systemPrompt, 
          version: skill.version, 
          ts: Date.now() 
        });
        return skill.systemPrompt;
      }
    } catch (err) {
      this.logger.warn(`DB read failed for skills[${code}], using fallback`, err);
    }
    
    // Fallback chain
    return fallbackMap[code] ?? 'Answer based on the knowledge base.';
  }

  async getFallbackMap(): Promise<Record<string, string>> {
    // Lazy load fallback từ file .prompt.ts hiện tại
    return {
      'faq_skill': FAQ_SKILL_INSTRUCTIONS,
      'tuition_explanation_skill': TUITION_SKILL_INSTRUCTIONS,
      'major_information_skill': MAJOR_INFO_SKILL_INSTRUCTIONS,
      'career_consulting_skill': CAREER_CONSULTING_SKILL_INSTRUCTIONS,
      'persuasion_skill': PERSUASION_SKILL_INSTRUCTIONS,
      'human_handoff_skill': HUMAN_HANDOFF_SKILL_INSTRUCTIONS,
    };
  }
}
```

### 5.3 `ResponseStrategiesService.getByIntentAndSkill`

```typescript
@Injectable()
export class ResponseStrategiesService {
  async getByIntentAndSkill(
    intent: string, 
    skill?: string,
  ): Promise<ResponseStrategyEntity | null> {
    try {
      // Tìm strategy phù hợp nhất
      // Priority: skill-specific > global
      // Order by priority DESC
      return await this.repo
        .createQueryBuilder('rs')
        .where('rs.enabled = :enabled', { enabled: true })
        .andWhere('(rs.skill_code = :skill OR rs.skill_code IS NULL)', { skill })
        .andWhere('rs.code LIKE :pattern', { pattern: `%${intent}%` }) // hoặc match theo code
        .orderBy('rs.priority', 'DESC')
        .getOne();
    } catch {
      return null; // fallback sẽ dùng prompt cũ
    }
  }
}
```

## 6. Graph Wiring

**File**: `Backend/src/ai-agent/ai-agent.service.ts`

```typescript
@Injectable()
export class AiAgentService {
  constructor(
    private kbService: KnowledgeBaseService,
    private corePrompts: CorePromptsService,
    private skills: SkillsService,
    private responseStrategies: ResponseStrategiesService,
  ) {}

  buildGraph() {
    return buildAgentGraph({
      kbService: this.kbService,
      corePrompts: this.corePrompts,
      skills: this.skills,
      responseStrategies: this.responseStrategies,
    });
  }
}
```

**File**: `Backend/src/ai-agent/graph.ts`

```typescript
export interface GraphDeps {
  kbService: KnowledgeBaseService;
  corePrompts: CorePromptsService;
  skills: SkillsService;
  responseStrategies: ResponseStrategiesService;
}

export function buildAgentGraph(deps: GraphDeps) {
  const workflow = new StateGraph(AgentStateAnnotation)
    // Factory nodes
    .addNode('clarification_resolution', 
      createClarificationResolutionNode(deps.corePrompts))
    .addNode('intent_detection', 
      createIntentDetectionNode(deps.corePrompts))
    .addNode('adaptive_reasoning', 
      createAdaptiveReasoningNode(deps.corePrompts, deps.skills))
    .addNode('knowledge_retrieval', 
      createKnowledgeRetrievalNode(deps.kbService))
    .addNode('response_strategy_node', 
      createResponseStrategyNode(deps.responseStrategies, deps.corePrompts))
    .addNode('response_packaging', 
      createResponsePackagingNode(deps.corePrompts))
    
    // Plain nodes (no DB dependency)
    .addNode('input_guard', inputGuardNode)
    .addNode('conversation_resume', conversationResumeNode)
    // ... etc
    
    // Edges giữ nguyên
    // ...
    ;
  
  return workflow.compile();
}
```

## 7. Migration Order (Test-Driven)

### Order đảm bảo test pass mỗi bước:

1. **Bước 1**: Seed DB với content GIỐNG HỆT file cũ
2. **Bước 2**: Refactor từng node một, theo thứ tự:
   - `intent_detection_node` (đơn giản nhất)
   - `clarification_resolution_node`
   - `response_strategy_node`
   - `adaptive_reasoning_node` (phức tạp nhất)
   - `response_packaging_node`
3. **Bước 3**: Sau MỖI node refactor, chạy test:
   - Unit test của node đó
   - E2E test happy path
   - Regression test (so sánh với output cũ)
4. **Bước 4**: Khi tất cả pass → merge

## 8. Fallback Prompts File

**File mới**: `Backend/src/ai-agent/nodes/fallback-prompts.ts`

Mục đích: Lưu hardcode của tất cả prompts để dùng khi DB fail.

```typescript
// Copy nguyên nội dung từ:
// - src/prompts/intent-detection.prompt.ts → FALLBACK_INTENT_DETECTION_PROMPT
// - src/prompts/reasoning.prompt.ts → FALLBACK_ADAPTIVE_REASONING_PROMPT
// - src/prompts/response-strategy.prompt.ts → FALLBACK_RESPONSE_STRATEGY_PROMPT
// - src/prompts/clarification-resolution.prompt.ts → FALLBACK_CLARIFICATION_RESOLUTION_PROMPT
// - src/prompts/response-packaging.prompt.ts → FALLBACK_PACKAGING_CONFIG
// - src/prompts/skills/*.prompt.ts → FALLBACK_SKILL_MAP
```

## 9. Testing Strategy

### 9.1 Unit test cho mỗi node
```typescript
describe('IntentDetectionNode (refactored)', () => {
  let node: Function;
  let corePrompts: CorePromptsService;

  beforeEach(() => {
    corePrompts = mockCorePromptsService();
    node = createIntentDetectionNode(corePrompts);
  });

  it('should load prompt from DB', async () => {
    await node({ user_message: 'test', conversation_history: [] });
    expect(corePrompts.getByCodeOrFallback).toHaveBeenCalledWith(
      'intent_detection', expect.any(String)
    );
  });

  it('should use fallback when DB fails', async () => {
    corePrompts.getByCodeOrFallback.mockResolvedValue('fallback');
    // ... verify fallback used
  });

  it('should produce same output as before migration', async () => {
    const result = await node({ user_message: 'Học phí' });
    expect(result).toMatchSnapshot();
  });
});
```

### 9.2 E2E test (regression)
```typescript
describe('Full agent flow (regression)', () => {
  const testCases = [
    { input: 'Học phí ngành IT', expectedIntent: 'tuition_inquiry' },
    { input: 'Cho em gặp tư vấn viên', expectedSkill: 'human_handoff_skill' },
    // ... 20+ cases
  ];

  for (const tc of testCases) {
    it(`should handle: "${tc.input}"`, async () => {
      const result = await agent.invoke({ user_message: tc.input, ... });
      expect(result.intent?.name).toBe(tc.expectedIntent);
    });
  }
});
```

## 10. Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Refactor làm vỡ flow | Test từng node, regression test |
| Cache stale data | TTL 60s + manual invalidate |
| Fallback không match DB | Seed phải copy y hệt file cũ |
| Service injection khó | Dùng factory pattern đã có |

## 11. Definition of Done

- [ ] 10 nodes đã refactor xong
- [ ] 4 nodes giữ nguyên được document rõ lý do
- [ ] Fallback prompts file có đầy đủ content cũ
- [ ] Unit test pass cho 10 nodes
- [ ] E2E regression test pass (20+ cases)
- [ ] DB down → fallback hoạt động
- [ ] Cache hoạt động (verify qua log)
- [ ] Graph.ts wired đúng với factory pattern
- [ ] Không có prompt import từ `src/prompts/` trong code runtime (chỉ trong fallback file)