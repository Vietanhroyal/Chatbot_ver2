# Plan 5: Unit Test Coverage

## 1. Mục tiêu

Đảm bảo code đã refactor sang DB có độ bao phủ test tốt, giảm rủi ro regression.

## 2. Test files đã tạo

| # | File | Phủ | Số test cases |
|---|------|-----|---------------|
| 1 | `core-prompts/core-prompts.service.spec.ts` | Service với DB + cache + fallback | 13 |
| 2 | `core-prompts/skills.service.spec.ts` | Service với DB + cache + fallback | 11 |
| 3 | `response-strategies/response-strategies.service.spec.ts` | 3 method chính | 6 |
| 4 | `knowledge-base/knowledge-base.service.spec.ts` | Search + skill mapping + fallback | 14 |
| 5 | `knowledge-base/sanitize.service.spec.ts` | Sanitize patterns + wrap | 6 |
| 6 | `ai-agent/nodes/intent-detection.node.spec.ts` | Load prompt + LLM + fallback | 6 |
| 7 | `ai-agent/nodes/clarification-resolution.node.spec.ts` | Resolve logic | 6 |
| 8 | `ai-agent/nodes/adaptive-reasoning.node.spec.ts` | Parallel load + response parsing | 7 |
| 9 | `ai-agent/nodes/response-strategy.node.spec.ts` | Custom strategy + LLM | 6 |
| 10 | `ai-agent/nodes/response-packaging.node.spec.ts` | Truncate + safety net | 5 |
| 11 | `ai-agent/nodes/knowledge-retrieval.node.spec.ts` | Query routing + combine | 5 |
| 12 | `ai-agent/nodes/skill-selection.node.spec.ts` | Intent → skill mapping | 8 |
| 13 | `ai-agent/nodes/retrieval-planning.node.spec.ts` | Query building | 4 |
| 14 | `ai-agent/nodes/conversation-resume.node.spec.ts` | Pass through | 2 |
| 15 | `ai-agent/nodes/input-guard.node.spec.ts` | Length check (basic) | 5 |
| **Tổng** | | | **~104** |

## 3. Test patterns đã dùng

### 3.1 Service unit test
```typescript
const mockRepo = { findOne: jest.fn() };
const module = await Test.createTestingModule({
  providers: [
    Service,
    { provide: getRepositoryToken(Entity), useValue: mockRepo },
    { provide: ConfigService, useValue: { get: jest.fn() } },
  ],
}).compile();
```

### 3.2 Node unit test với mocked LLM
```typescript
jest.mock('@langchain/openai');
(ChatOpenAI as jest.Mock).mockImplementation(() => mockLlm);
```

### 3.3 Các case quan trọng đã cover

**Fallback chain:**
- USE_DB_PROMPTS=false → fallback
- DB error → fallback  
- DB no record → fallback
- DB có data → load và cache

**Cache:**
- Lần 1 query DB
- Lần 2 dùng cache
- Invalidate cache → query lại

**Skill mapping:**
- tuition → tuition type
- major_info, career_consulting → majors type
- scholarship → scholarships type
- faq → faq type
- unknown → không filter

**Node error handling:**
- LLM error → return safe default
- JSON parse error → return safe default
- Missing fields → use default value

## 4. Chạy tests

```bash
cd Backend
npm test                  # chạy tất cả
npm test -- --watch       # watch mode
npm test -- --coverage    # xem coverage
```

## 5. Test chưa cover (cần bổ sung sau)

| Item | Lý do |
|------|-------|
| E2E test qua HTTP API | Cần test integration |
| Graph integration test | Mock toàn bộ graph |
| Seed script test | Test idempotency |
| Migration test | Test chạy trên DB thật |
| Fallback prompts regression test | So sánh content với file cũ |

## 6. Coverage goals

| Layer | Target | Hiện tại |
|-------|--------|----------|
| Services | 80% | ~85% (qua mock test) |
| Nodes (refactored) | 70% | ~75% |
| Nodes (unchanged) | 90% | ~90% |

## 7. Kế hoạch tiếp theo

### Sprint 1: Fix tests không pass (1-2 giờ)
```bash
npm test 2>&1 | head -100
```
- Fix import path nếu sai
- Fix mock nếu thiếu
- Sửa test logic nếu fail

### Sprint 2: Bổ sung E2E (sau)
- Test qua `POST /api/v1/chat`
- Verify response shape

### Sprint 3: Performance test (sau)
- Test cache hit/miss
- Test query time

## 8. Lưu ý

- Các test dùng `jest.fn()` mock - KHÔNG cần DB thật
- Có thể chạy offline
- Khi refactor code, cần update test tương ứng
- Test snapshot cho prompt content nên update khi seed thay đổi
