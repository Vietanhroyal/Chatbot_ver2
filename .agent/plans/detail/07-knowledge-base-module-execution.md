# Detailed Execution Plan: `knowledge-base/` Module

## Pre-requisites
- [ ] `common/` module is complete (constants for skill names)
- [ ] `config/` module is complete
- [ ] `npm run build` passes

---

## Phase 1: Create Folder Structure
**Estimated Time:** 1 minute

```text
src/
└── knowledge-base/
    ├── knowledge-base.module.ts
    ├── knowledge-base.service.ts
    └── data/
        ├── faq.json
        ├── admissions.md
        ├── tuition.md
        ├── majors.md
        └── scholarships.md
```

---

## Phase 2: Create Knowledge Data Files
**Estimated Time:** 30 minutes
**Why first:** The service reads these at startup.

### Task 2.1: Create `src/knowledge-base/data/faq.json`

```json
[
  {
    "id": "faq_001",
    "question": "Trường có mấy cơ sở?",
    "answer": "Trường hiện có 2 cơ sở: Cơ sở 1 tại Quận 1, Cơ sở 2 tại Thủ Đức.",
    "category": "general"
  },
  {
    "id": "faq_002",
    "question": "Hạn chót nộp hồ sơ là khi nào?",
    "answer": "Hạn chót nộp hồ sơ xét tuyển đợt 1 là ngày 30/06/2026. Đợt 2 là 30/08/2026.",
    "category": "admission"
  },
  {
    "id": "faq_003",
    "question": "Trường có ký túc xá không?",
    "answer": "Có, trường có ký túc xá tại cơ sở Thủ Đức với giá từ 1.500.000đ/tháng.",
    "category": "general"
  },
  {
    "id": "faq_004",
    "question": "Làm sao để liên hệ tư vấn tuyển sinh?",
    "answer": "Hotline tư vấn: 1900-xxxx (8h-17h thứ 2-7). Email: tuyensinh@example.edu.vn",
    "category": "contact"
  }
]
```

### Task 2.2: Create `src/knowledge-base/data/admissions.md`

```markdown
# Thông tin tuyển sinh 2026

## Phương thức xét tuyển

### 1. Xét học bạ THPT
- Sử dụng điểm trung bình 3 môn theo tổ hợp.
- Yêu cầu: Tốt nghiệp THPT hoặc tương đương.
- Điểm sàn: Từ 18 điểm trở lên (tùy ngành).

### 2. Xét điểm thi THPT Quốc gia
- Sử dụng kết quả kỳ thi THPT Quốc gia.
- Điểm chuẩn công bố sau kỳ thi.

### 3. Xét tuyển thẳng
- Học sinh giỏi cấp tỉnh/thành phố trở lên.
- Thí sinh đạt giải Olympic quốc gia.

## Hồ sơ cần chuẩn bị
1. Phiếu đăng ký xét tuyển (theo mẫu).
2. Bản sao công chứng học bạ THPT.
3. Bản sao công chứng bằng tốt nghiệp THPT.
4. CMND/CCCD (bản sao công chứng).
5. 2 ảnh 3x4.

## Thời gian xét tuyển
- Đợt 1: 01/03/2026 – 30/06/2026
- Đợt 2: 01/07/2026 – 30/08/2026
```

### Task 2.3: Create `src/knowledge-base/data/tuition.md`

```markdown
# Học phí năm học 2026-2027

## Bảng học phí theo ngành

| Ngành | Học phí/kỳ | Học phí/năm |
|-------|-----------|-------------|
| Công nghệ thông tin | 15.000.000đ | 30.000.000đ |
| Khoa học dữ liệu | 16.000.000đ | 32.000.000đ |
| Quản trị kinh doanh | 13.000.000đ | 26.000.000đ |
| Ngôn ngữ Anh | 12.000.000đ | 24.000.000đ |
| Kế toán | 12.500.000đ | 25.000.000đ |

## Chính sách hỗ trợ
- Giảm 10% nếu đóng trọn năm.
- Hỗ trợ vay vốn ngân hàng (lãi suất 0% trong thời gian học).
- Miễn giảm cho sinh viên có hoàn cảnh khó khăn.

## Phương thức đóng học phí
- Chuyển khoản ngân hàng.
- Đóng trực tiếp tại phòng Tài chính.
- Thanh toán qua ví điện tử.
```

### Task 2.4: Create `src/knowledge-base/data/majors.md`

```markdown
# Thông tin ngành đào tạo

## Công nghệ thông tin (CNTT)
- **Mã ngành:** 7480201
- **Thời gian đào tạo:** 4 năm
- **Tổ hợp xét tuyển:** A00, A01, D01
- **Mô tả:** Đào tạo kỹ sư phần mềm, lập trình viên.
- **Cơ hội nghề nghiệp:** Lập trình viên, kỹ sư phần mềm, quản lý dự án IT.

## Khoa học dữ liệu
- **Mã ngành:** 7460108
- **Thời gian đào tạo:** 4 năm
- **Tổ hợp xét tuyển:** A00, A01, D07
- **Mô tả:** Phân tích dữ liệu lớn, AI/ML.
- **Cơ hội nghề nghiệp:** Data Analyst, Data Engineer, ML Engineer.

## Quản trị kinh doanh
- **Mã ngành:** 7340101
- **Thời gian đào tạo:** 4 năm
- **Tổ hợp xét tuyển:** A00, A01, D01
- **Mô tả:** Quản lý doanh nghiệp, marketing, tài chính.
- **Cơ hội nghề nghiệp:** Quản lý, chuyên viên marketing, nhân sự.
```

### Task 2.5: Create `src/knowledge-base/data/scholarships.md`

```markdown
# Chính sách học bổng 2026

## 1. Học bổng tuyển sinh
- **100% học phí năm đầu:** Thủ khoa, á khoa kỳ thi THPT Quốc gia.
- **50% học phí năm đầu:** Điểm thi từ 27/30 trở lên.
- **30% học phí năm đầu:** Điểm thi từ 25/30 trở lên.

## 2. Học bổng học tập
- GPA >= 3.6: Học bổng 50% học phí kỳ tiếp theo.
- GPA >= 3.2: Học bổng 25% học phí kỳ tiếp theo.

## 3. Học bổng khó khăn
- Hộ nghèo, cận nghèo: Hỗ trợ 50-100% học phí.
- Mồ côi: Miễn 100% học phí.

## Điều kiện chung
- Không bị kỷ luật.
- Đăng ký đúng hạn.
```

### Task 2.6: Verify
- [ ] All 5 data files exist in `src/knowledge-base/data/`.
- [ ] JSON file is valid (no syntax errors).

---

## Phase 3: Knowledge Base Types
**Estimated Time:** 5 minutes

### Task 3.1: Create `src/knowledge-base/knowledge-base.types.ts`

```typescript
/** A single FAQ entry from faq.json */
export interface FaqEntry {
  id: string;
  question: string;
  answer: string;
  category: string;
}

/** Result from a knowledge base search */
export interface KnowledgeSearchResult {
  content: string;
  source: string;
  relevanceScore?: number;
}
```

---

## Phase 4: Knowledge Base Service (`knowledge-base.service.ts`)
**Estimated Time:** 25 minutes

### Task 4.1: Create `src/knowledge-base/knowledge-base.service.ts`

```typescript
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { SKILLS } from '../common/constants';
import { FaqEntry, KnowledgeSearchResult } from './knowledge-base.types';

/**
 * Loads static knowledge files and provides a search interface.
 *
 * MVP: Simple keyword matching + skill-based routing.
 * Future: Replace with Vector DB (Chroma/Milvus) without
 *         changing the public API surface.
 */
@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name);
  private readonly dataDir = path.join(__dirname, 'data');

  private faqData: FaqEntry[] = [];
  private admissionsData = '';
  private tuitionData = '';
  private majorsData = '';
  private scholarshipsData = '';

  onModuleInit() {
    this.loadAllData();
  }

  /**
   * Main search method called by the knowledge-retrieval node.
   *
   * @param query - The user's question or search keywords
   * @param skill - Optional skill filter to narrow down the data source
   * @returns Combined relevant context as a string
   */
  async search(
    query: string,
    skill?: string,
  ): Promise<KnowledgeSearchResult[]> {
    this.logger.log(`Searching KB | skill=${skill} | query="${query}"`);

    // Skill-based routing: return the entire relevant document
    switch (skill) {
      case SKILLS.TUITION:
        return [{ content: this.tuitionData, source: 'tuition.md' }];

      case SKILLS.MAJOR_INFO:
      case SKILLS.CAREER_CONSULTING:
        return [{ content: this.majorsData, source: 'majors.md' }];

      case SKILLS.SCHOLARSHIP:
        return [{ content: this.scholarshipsData, source: 'scholarships.md' }];

      case SKILLS.FAQ:
        return this.searchFaq(query);

      default:
        // No specific skill — search across all sources
        return this.searchAll(query);
    }
  }

  /**
   * Search FAQ entries by keyword matching.
   */
  private searchFaq(query: string): KnowledgeSearchResult[] {
    const lowerQuery = query.toLowerCase();
    const matches = this.faqData.filter(
      (entry) =>
        entry.question.toLowerCase().includes(lowerQuery) ||
        entry.answer.toLowerCase().includes(lowerQuery),
    );

    if (matches.length === 0) {
      // Return all FAQs as context if no specific match
      return this.faqData.map((entry) => ({
        content: `Q: ${entry.question}\nA: ${entry.answer}`,
        source: `faq.json#${entry.id}`,
      }));
    }

    return matches.map((entry) => ({
      content: `Q: ${entry.question}\nA: ${entry.answer}`,
      source: `faq.json#${entry.id}`,
    }));
  }

  /**
   * Fallback: search across all data sources by keyword.
   */
  private searchAll(query: string): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    // Check each data source for keyword matches
    const sources = [
      { data: this.tuitionData, name: 'tuition.md' },
      { data: this.majorsData, name: 'majors.md' },
      { data: this.admissionsData, name: 'admissions.md' },
      { data: this.scholarshipsData, name: 'scholarships.md' },
    ];

    for (const source of sources) {
      if (source.data.toLowerCase().includes(lowerQuery)) {
        results.push({ content: source.data, source: source.name });
      }
    }

    // Always include FAQ matches
    const faqResults = this.searchFaq(query);
    results.push(...faqResults);

    return results;
  }

  /**
   * Loads all static data files into memory.
   * Called once at module initialization.
   */
  private loadAllData(): void {
    this.faqData = this.loadJson<FaqEntry[]>('faq.json', []);
    this.admissionsData = this.loadMarkdown('admissions.md');
    this.tuitionData = this.loadMarkdown('tuition.md');
    this.majorsData = this.loadMarkdown('majors.md');
    this.scholarshipsData = this.loadMarkdown('scholarships.md');

    this.logger.log(
      `Knowledge Base loaded: ${this.faqData.length} FAQs, ` +
      `${[this.admissionsData, this.tuitionData, this.majorsData, this.scholarshipsData]
        .filter(Boolean).length} documents`,
    );
  }

  private loadJson<T>(filename: string, fallback: T): T {
    try {
      const filePath = path.join(this.dataDir, filename);
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as T;
    } catch (error) {
      this.logger.warn(`Failed to load ${filename}: ${error}`);
      return fallback;
    }
  }

  private loadMarkdown(filename: string): string {
    try {
      const filePath = path.join(this.dataDir, filename);
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      this.logger.warn(`Failed to load ${filename}: ${error}`);
      return '';
    }
  }
}
```

### Task 4.2: Verify
- [ ] `npm run build` passes.
- [ ] No `any` types (note: `FaqEntry[]` is typed, not `any`).

---

## Phase 5: Knowledge Base Module (`knowledge-base.module.ts`)
**Estimated Time:** 3 minutes

### Task 5.1: Create `src/knowledge-base/knowledge-base.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { KnowledgeBaseService } from './knowledge-base.service';

@Module({
  providers: [KnowledgeBaseService],
  exports: [KnowledgeBaseService],
})
export class KnowledgeBaseModule {}
```

---

## Phase 6: Register in `app.module.ts`
**Estimated Time:** 2 minutes

### Task 6.1: Update `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
import { HealthModule } from './health/health.module';
import { AiChatModule } from './ai-chat/ai-chat.module';
import { KnowledgeBaseModule } from './knowledge-base/knowledge-base.module';

@Module({
  imports: [
    AppConfigModule,
    HealthModule,
    AiChatModule,
    KnowledgeBaseModule,
  ],
})
export class AppModule {}
```

---

## Phase 7: Configure NestJS to Copy Data Files
**Estimated Time:** 5 minutes

> **Critical:** NestJS compiles TypeScript to `dist/`. Static files in `src/`
> are NOT automatically copied. The `data/` folder must be included.

### Task 7.1: Update `nest-cli.json`

Add the `compilerOptions.assets` field:

```json
{
  "collection": "@nestjs/schematics",
  "sourceRoot": "src",
  "compilerOptions": {
    "assets": [
      {
        "include": "knowledge-base/data/**/*",
        "watchAssets": true
      }
    ]
  }
}
```

### Task 7.2: Verify
- [ ] Run `npm run build`.
- [ ] Check that `dist/knowledge-base/data/` contains all 5 files.
- [ ] If files are missing, the build config is wrong.

---

## Phase 8: Smoke Test
**Estimated Time:** 10 minutes

### Task 8.1: Verify data loading at startup

```bash
npm run start:dev
```

**Expected Console Output:**
```text
[KnowledgeBaseService] Knowledge Base loaded: 4 FAQs, 4 documents
```

### Task 8.2: Quick integration test (optional)

Temporarily add a test endpoint in `health.controller.ts`:

```typescript
@Get('kb-test')
async testKb() {
  // Inject KnowledgeBaseService temporarily
  // Call search('học phí', 'tuition_explanation_skill')
  // Verify it returns tuition.md content
}
```

Or write a simple script:

```typescript
// test-kb.ts (run with ts-node)
import { KnowledgeBaseService } from './knowledge-base/knowledge-base.service';
const kb = new KnowledgeBaseService();
kb.onModuleInit();
const results = kb.search('học phí', 'tuition_explanation_skill');
console.log(results);
```

### Task 8.3: Verify all acceptance criteria
- [ ] Service loads all 5 data files at startup without errors.
- [ ] `search(query, 'tuition_explanation_skill')` returns tuition data.
- [ ] `search(query, 'faq_skill')` returns matching FAQ entries.
- [ ] `search(query, 'major_information_skill')` returns majors data.
- [ ] `search(query, 'scholarship_advisory_skill')` returns scholarships data.
- [ ] Missing file → logged warning, returns empty string (no crash).
- [ ] `data/` files are correctly copied to `dist/` on build.
- [ ] No `any` types in any file.
- [ ] `npm run build` passes with zero errors.

---

## Summary

```text
Phase 1  →  Create folder structure         (1 min)
Phase 2  →  Create 5 knowledge data files   (30 min)
Phase 3  →  knowledge-base.types.ts          (5 min)
Phase 4  →  knowledge-base.service.ts        (25 min)
Phase 5  →  knowledge-base.module.ts         (3 min)
Phase 6  →  Register in app.module.ts        (2 min)
Phase 7  →  Configure nest-cli.json assets   (5 min)
Phase 8  →  Smoke test                       (10 min)
─────────────────────────────────────────────────────
Total                                        ~81 min
```

> **Next module:** `logging/` (Module 08) or `ai-agent/` (Module 05)
