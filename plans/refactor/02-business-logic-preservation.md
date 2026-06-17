# Refactor Plan 2: Business Logic Preservation

## 1. Mục tiêu

**Đảm bảo 100% luồng nghiệp vụ hiện tại vẫn hoạt động đúng sau khi migrate sang DB.**

Luồng nghiệp vụ cốt lõi được định nghĩa trong LangGraph Flow (14 nodes + edges) và phải giữ nguyên:
- Clarification Resume Loop
- Intent Detection flow
- Skill routing
- RAG retrieval
- Adaptive reasoning với missing info handling
- Response packaging

## 2. Nguyên tắc

### 2.1 Không thay đổi
- **Graph structure**: 14 nodes + edges giữ nguyên
- **State schema** (`AgentState`): giữ nguyên tất cả fields
- **Node contracts**: input/output của mỗi node không đổi
- **Edge routing logic**: giữ nguyên điều kiện
- **Constants**: `INTENTS`, `SKILLS`, `INPUT_GUARD`

### 2.2 Chỉ thay đổi implementation
- Node đọc prompt từ DB thay vì import `.prompt.ts`
- Service load data từ DB thay vì đọc file
- Internal implementation, không ảnh hưởng interface

### 2.3 Backward compatibility
- Mỗi thay đổi phải có fallback path
- Nếu DB fail → dùng hardcode cũ
- Feature flag để toggle on/off

## 3. Mapping: Node ↔ Service ↔ DB

### Bảng ánh xạ chi tiết

| # | Node | Hiện tại dùng | Sau refactor dùng | DB Table |
|---|------|---------------|-------------------|----------|
| 1 | `input_guard_node` | `INPUT_GUARD` constants | `INPUT_GUARD` (giữ nguyên) | - |
| 2 | `conversation_resume_node` | State check rule | State check rule (giữ nguyên) | - |
| 3 | `clarification_resolution_node` | `CLARIFICATION_RESOLUTION_PROMPT` | `CorePromptsService.getByCode('clarification_resolution')` | `core_prompts` |
| 4 | `clarification_retry_strategy_node` | Template/Rule | Template/Rule (giữ nguyên) | - |
| 5 | `continue_previous_task_node` | State restore rule | State restore rule (giữ nguyên) | - |
| 6 | `intent_detection_node` | `INTENT_DETECTION_PROMPT` | `CorePromptsService.getByCode('intent_detection')` | `core_prompts` |
| 7 | `intent_clarification_strategy_node` | Template/Rule | Template/Rule (giữ nguyên) | - |
| 8 | `skill_selection_node` | Rule | Rule (giữ nguyên) | - |
| 9 | `retrieval_planning_node` | Template/LLM | `RetrievalPlanningService` (DB-backed) | `core_prompts` |
| 10 | `knowledge_retrieval_node` | `KnowledgeBaseService.search()` | `KnowledgeBaseService.search()` (DB-backed) | `documents` |
| 11 | `adaptive_reasoning_node` | `ADAPTIVE_REASONING_PROMPT` + `getSkillPrompt()` | `CorePromptsService` + `SkillsService.getSystemPrompt()` | `core_prompts`, `skills` |
| 12 | `missing_info_strategy_node` | Template/Rule | Template/Rule (giữ nguyên) | - |
| 13 | `response_strategy_node` | `RESPONSE_STRATEGY_PROMPT` | `ResponseStrategiesService.getByIntent()` | `response_strategies` |
| 14 | `response_packaging_node` | Hardcoded config | `CorePromptsService.getByCode('response_packaging')` | `core_prompts` |

## 4. Verification cho từng Node

### Node 1: `input_guard_node`
**Verify**:
- [ ] Length check vẫn dùng `INPUT_GUARD.MIN/MAX_MESSAGE_LENGTH`
- [ ] Pattern check vẫn dùng regex list cũ
- [ ] Output state giữ nguyên: `{ is_safe, response_type, final_messages }`
- [ ] Test cases: empty msg, msg quá dài, msg chứa "ignore previous"

### Node 2: `conversation_resume_node`
**Verify**:
- [ ] Logic check `pending_clarification` giữ nguyên
- [ ] Output routing không đổi

### Node 3: `clarification_resolution_node`
**Verify**:
- [ ] Prompt load từ `CorePromptsService` nhưng **NỘI DUNG phải giống file cũ**
- [ ] Behavior với user reply giải quyết clarification → giống cũ
- [ ] Behavior với user reply không giải quyết → giống cũ
- [ ] Test: user trả lời "Có" → resolved = true

### Node 4: `clarification_retry_strategy_node`
**Verify**:
- [ ] Output format không đổi
- [ ] Routing đến `response_packaging_node` giữ nguyên

### Node 5: `continue_previous_task_node`
**Verify**:
- [ ] State restore đúng fields
- [ ] Output routing đến `retrieval_planning_node`

### Node 6: `intent_detection_node`
**Verify**:
- [ ] Prompt từ DB nhưng content match file `intent-detection.prompt.ts`
- [ ] Output format: `{ intent: { name, confidence } }` giống cũ
- [ ] Threshold `confidence >= 0.5` cho "known" vẫn đúng
- [ ] Test: input "học phí bao nhiêu" → intent = `tuition_inquiry`

### Node 7: `intent_clarification_strategy_node`
**Verify**:
- [ ] Logic tạo câu hỏi không đổi
- [ ] Routing đến `response_packaging_node`

### Node 8: `skill_selection_node`
**Verify**:
- [ ] Mapping intent → skill không đổi
- [ ] Special case: `HUMAN_HANDOFF` routing không đổi

### Node 9: `retrieval_planning_node`
**Verify**:
- [ ] Logic tạo search queries giống cũ
- [ ] Output: `retrieval_plan: string[]`

### Node 10: `knowledge_retrieval_node`
**Verify**:
- [ ] Vẫn gọi `KnowledgeBaseService.search(query, skill)`
- [ ] Nhưng bên trong giờ dùng vector search
- [ ] Output format: `retrieved_knowledge: string` (concat các chunks)
- [ ] Test: query "học phí IT" → trả về content từ tuition.md

### Node 11: `adaptive_reasoning_node` ⚠️ QUAN TRỌNG NHẤT
**Verify**:
- [ ] Skill prompt load từ `SkillsService.getSystemPrompt(code)`
- [ ] **NỘI DUNG skill prompt phải giống file `.prompt.ts` tương ứng**
- [ ] Adaptive reasoning prompt từ DB match file cũ
- [ ] Placeholders `{user_message}`, `{intent}`, `{skill}`, `{context}`, `{conversation_history}`, `{skill_instructions}` đều được thay thế
- [ ] Output: `{ need_more_info, reasoning_level, missing_info_fields, response_strategy, response_type }`
- [ ] **Critical test**: skill routing đúng - query về tuition → dùng `TUITION_SKILL_INSTRUCTIONS`

### Node 12: `missing_info_strategy_node`
**Verify**:
- [ ] Output câu hỏi clarification giống cũ
- [ ] Routing đến `response_packaging_node`

### Node 13: `response_strategy_node`
**Verify**:
- [ ] Strategy logic dựa trên intent/skill
- [ ] Output: `final_messages: { type, content }[]`
- [ ] Tone/style giống cũ

### Node 14: `response_packaging_node`
**Verify**:
- [ ] Config `MAX_MESSAGE_LENGTH`, `DEFAULT_QUICK_REPLIES` từ DB match file cũ
- [ ] Channel config giống cũ
- [ ] Output format JSON giống cũ

## 5. State Schema không đổi

```typescript
// PHẢI giữ nguyên 100%
interface AgentState {
  session_id: string;
  user_message: string;
  conversation_history: Message[];
  is_safe: boolean;
  pending_clarification: PendingClarification | null;
  clarification_resolved: boolean;
  intent: { name: string; confidence: number } | null;
  selected_skill: string | null;
  retrieval_plan: string[] | null;
  retrieved_knowledge: string | null;
  reasoning_level: ReasoningLevel | null;
  need_more_info: boolean;
  missing_info_fields: string[] | null;
  response_strategy: string | null;
  response_type: AgentResponseType;
  final_messages: { type: 'text'; content: string }[] | null;
}
```

## 6. Test Plan cho Business Logic

### 6.1 Test cases quan trọng (KHÔNG ĐƯỢC FAIL)

```typescript
describe('Business Logic Preservation', () => {
  
  describe('Happy path: Simple FAQ', () => {
    it('should answer FAQ correctly after migration', async () => {
      const input = 'Trường có những ngành nào?';
      const result = await agent.invoke({ user_message: input, ... });
      
      expect(result.intent.name).toBe('major_inquiry');
      expect(result.selected_skill).toBe('major_information_skill');
      expect(result.response_type).toBe('final_answer');
      expect(result.final_messages).toBeDefined();
      expect(result.final_messages.length).toBeGreaterThan(0);
    });
  });

  describe('Clarification loop: Tuition without context', () => {
    it('should ask clarification when info missing', async () => {
      const input = 'Học phí bao nhiêu?';
      const result = await agent.invoke({ user_message: input, ... });
      
      // Lần 1: hỏi clarification
      expect(result.need_more_info).toBe(true);
      expect(result.response_type).toBe('ask_clarification');
    });

    it('should resume task after user provides info', async () => {
      // Lần 2: user trả lời "ngành IT"
      const result = await agent.invoke({
        user_message: 'ngành IT',
        pending_clarification: { type: 'missing_info', missing_entities: ['major'] },
        ...
      });
      
      expect(result.clarification_resolved).toBe(true);
      expect(result.response_type).toBe('final_answer');
    });
  });

  describe('Skill routing', () => {
    it('should route tuition queries to tuition skill', async () => {
      const result = await agent.invoke({ 
        user_message: 'Học phí ngành IT năm 2025' 
      });
      
      expect(result.selected_skill).toBe('tuition_explanation_skill');
    });

    it('should route career consulting to career skill', async () => {
      const result = await agent.invoke({
        user_message: 'Em không biết chọn ngành gì'
      });
      
      expect(result.selected_skill).toBe('career_consulting_skill');
    });

    it('should route handoff request to human handoff', async () => {
      const result = await agent.invoke({
        user_message: 'Cho em gặp tư vấn viên'
      });
      
      expect(result.selected_skill).toBe('human_handoff_skill');
      expect(result.response_type).toBe('final_answer');
    });
  });

  describe('RAG retrieval', () => {
    it('should retrieve relevant chunks for tuition query', async () => {
      const result = await agent.invoke({
        user_message: 'Học phí ngành CNTT'
      });
      
      expect(result.retrieved_knowledge).toBeDefined();
      expect(result.retrieved_knowledge).toContain('CNTT');
      // hoặc match một keyword trong tuition.md
    });
  });

  describe('Response packaging', () => {
    it('should split long response into multiple messages', async () => {
      // Input cần response dài
      const result = await agent.invoke({...});
      
      // Kiểm tra mỗi message không vượt MAX_MESSAGE_LENGTH
      result.final_messages.forEach(msg => {
        expect(msg.content.length).toBeLessThanOrEqual(MAX_MESSAGE_LENGTH);
      });
    });
  });
});
```

### 6.2 Regression tests

```typescript
describe('Regression: Compare before vs after migration', () => {
  
  it('should produce identical output for same input', async () => {
    const testCases = [
      'Học phí ngành IT',
      'Cho em hỏi về ngành CNTT',
      'Em muốn gặp tư vấn viên',
      // ... 20+ test cases từ log cũ
    ];

    for (const input of testCases) {
      const beforeResult = await runWithHardcoded(input);
      const afterResult = await runWithDB(input);
      
      expect(afterResult.intent.name).toBe(beforeResult.intent.name);
      expect(afterResult.selected_skill).toBe(beforeResult.selected_skill);
      expect(afterResult.response_type).toBe(beforeResult.response_type);
    }
  });
});
```

## 7. Migration Order (đảm bảo test pass mỗi bước)

### Phase A: Chỉ đổi cách load prompt (không đổi content)
1. Refactor `getSkillPrompt()` → `SkillsService.getSystemPrompt()`
2. Seed DB với **NỘI DUNG GIỐNG HỆT** file cũ
3. Run tests → phải pass
4. Nếu fail → check content DB vs file

### Phase B: RAG migration (giữ fallback)
1. Implement vector search song song với keyword match
2. Feature flag `USE_RAG_SEARCH=false` → dùng keyword cũ
3. So sánh output keyword vs vector → điều chỉnh threshold
4. Khi confidence cao → flip flag sang `true`

### Phase C: Cache & optimization
1. Thêm cache cho skills/prompts
2. Verify không ảnh hưởng output

## 8. Rollback Strategy

Nếu phát hiện bug sau deploy:

```bash
# Trong .env
USE_DB_PROMPTS=false    # quay về hardcode
USE_RAG_SEARCH=false    # quay về keyword search
```

Restart app → chạy hoàn toàn như trước migration.

## 9. Monitoring sau migration

Metrics cần theo dõi:
- [ ] Intent detection accuracy (so với baseline trước migration)
- [ ] Skill routing distribution (không đổi nhiều)
- [ ] Response length distribution
- [ ] Clarification rate (không đổi)
- [ ] Latency per node
- [ ] Error rate per node

## 10. Definition of Done cho Plan này

- [ ] Tất cả 14 nodes giữ nguyên signature input/output
- [ ] Tất cả edge routing conditions không đổi
- [ ] State schema không đổi
- [ ] Test suite business logic pass 100%
- [ ] Regression test: output giống cũ cho 20+ test cases
- [ ] Nội dung prompt trong DB match file cũ (character-by-character)
- [ ] Fallback hoạt động khi DB down
- [ ] Rollback được bằng feature flag

## 11. Out of scope

- Thêm node mới
- Thay đổi flow
- Thêm tính năng mới
- Tối ưu performance (chỉ làm sau khi business logic đã ổn định)
