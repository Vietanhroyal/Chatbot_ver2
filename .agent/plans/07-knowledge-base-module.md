# Module 07: `knowledge-base/` — Data Retrieval Layer

## Overview
This module handles loading and searching the "ground truth" data for the chatbot. For the MVP, it reads from static JSON and Markdown files.

## Dependencies
- `fs` / `fs/promises`
- `path`

## Priority: **High** (Sprint 1/2)

---

## File 1: `src/knowledge-base/data/` (Static Files)

### Purpose
Hold the actual knowledge files.

### Required Files (MVP)
- `faq.json`: List of Q&A objects.
- `admissions.md`: Markdown text about admission rules.
- `tuition.md`: Pricing data.
- `majors.md`: Course descriptions.

---

## File 2: `src/knowledge-base/knowledge-base.service.ts`

### Purpose
Reads the static files and provides a simple search interface.

### Requirements
- On module init (or via lazy loading), parse the markdown and JSON files into memory.
- Provide a method: `search(query: string, skill?: string): Promise<string>`
- MVP implementation: If skill is `faq`, return `faq.json` stringified. If `tuition`, return `tuition.md`. Basic keyword matching for general queries.
- Future phase preparation: Keep the API interface clean so switching to a Vector DB (like Milvus/Chroma) later doesn't break the agent nodes.

### Code Pattern
```typescript
@Injectable()
export class KnowledgeBaseService {
  private faqData: any;
  private tuitionData: string;

  constructor() {
    this.loadData();
  }

  private loadData() {
    // Read files using fs.readFileSync
    // Store in class properties
  }

  async search(query: string, filterSkill?: string): Promise<string> {
    // 1. Simple routing based on skill
    if (filterSkill === 'tuition_explanation_skill') {
      return this.tuitionData;
    }
    
    if (filterSkill === 'faq_skill') {
      // Very basic keyword match against faq.json keys
      return JSON.stringify(this.faqData); // Or filtered subset
    }

    // 2. Fallback text search
    return "Relevant context combined...";
  }
}
```

---

## Acceptance Criteria
- [ ] Service successfully loads files from the file system.
- [ ] `search` method returns relevant text blocks based on the input query/skill.
- [ ] Gracefully handles missing files (logs error, returns empty string).
