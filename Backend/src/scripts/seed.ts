import 'reflect-metadata'
import { DataSource } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { SkillEntity } from '../database/entities/skill.entity'
import { CorePromptEntity } from '../database/entities/core-prompt.entity'
import { ResponseStrategyEntity } from '../database/entities/response-strategy.entity'
import { DocumentEntity } from '../database/entities/document.entity'
import { ADAPTIVE_REASONING_PROMPT } from '../prompts/reasoning.prompt'

const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USER || 'myuser',
  password: process.env.DB_PASSWORD || 'mypassword',
  database: process.env.DB_NAME || 'rag_db',
  entities: [
    SkillEntity,
    CorePromptEntity,
    ResponseStrategyEntity,
    DocumentEntity,
  ],
  synchronize: false,
})

const SKILL_FILES: Record<string, string> = {
  faq_skill: 'faq.prompt.ts',
  tuition_explanation_skill: 'tuition.prompt.ts',
  major_information_skill: 'major-info.prompt.ts',
  career_consulting_skill: 'career-consulting.prompt.ts',
  persuasion_skill: 'persuasion.prompt.ts',
  human_handoff_skill: 'human-handoff.prompt.ts',
}

const CORE_PROMPTS: Record<string, { content: string; description: string }> = {
  intent_detection: {
    content: `Bạn là công cụ phân loại ý định (intent) cho chatbot tư vấn tuyển sinh chính thức của Trường Đại học Việt Nhật. Mặc định mọi câu hỏi đều liên quan đến Trường Đại học Việt Nhật.

## Nhiệm vụ
Phân tích tin nhắn của người dùng và phân loại nó vào CHÍNH XÁC MỘT ý định bên dưới.

## Danh sách Ý định (Intents)
- "tuition_inquiry": Hỏi về học phí, phương thức đóng học phí, hoặc hỗ trợ tài chính.
- "major_inquiry": Hỏi thông tin thực tế về một ngành học/chương trình cụ thể.
- "major_consultation": Tìm kiếm lời khuyên hoặc tư vấn về việc chọn ngành/định hướng nghề nghiệp.
- "scholarship_inquiry": Hỏi về cơ hội học bổng, yêu cầu hoặc điều kiện ứng tuyển.
- "admission_method_inquiry": Hỏi về các phương thức xét tuyển.
- "deadline_inquiry": Hỏi về thời hạn đăng ký hoặc nộp hồ sơ.
- "general_faq": Các câu hỏi chung.
- "human_support_request": Yêu cầu được nói chuyện với tư vấn viên là người thật.
- "unknown": Không thể xác định được ý định.

## Quy tắc
1. Chọn ý định CỤ THỂ nhất.
2. Phản hồi CHỈ bằng JSON.

## Định dạng đầu ra (Chỉ JSON)
{
  "name": "<tên_ý_định>",
  "confidence": <0.0 đến 1.0>
}

## Tin nhắn người dùng
{user_message}`,
    description: 'Intent detection prompt for classifying user messages',
  },
  clarification_resolution: {
    content: `Bạn đang đánh giá xem câu trả lời của người dùng có giải quyết được câu hỏi làm rõ đã hỏi trước đó hay không.

## Câu hỏi đang chờ
Loại: {pending_type}
Câu hỏi đã hỏi: "{pending_question}"
Thông tin cần thiết: {missing_fields}

## Câu trả lời của người dùng
"{user_message}"

## Nhiệm vụ
1. Xác định xem câu trả lời có cung cấp thông tin chúng ta đã hỏi hay không.
2. Nếu CÓ: Trích xuất dữ liệu liên quan.
3. Nếu KHÔNG: Người dùng có thể đã đổi chủ đề hoặc nói "tôi không biết".

## Định dạng đầu ra (Chỉ JSON)
{
  "resolved": true | false,
  "extracted_data": { "<tên_trường>": "<giá_trị>" } | null,
  "reasoning": "Giải thích ngắn gọn"
}`,
    description: 'Clarification resolution prompt',
  },
  reasoning: {
    content: `Bạn là chatbot tư vấn tuyển sinh, hướng nghiệp chính thức của Trường Đại học Việt Nhật.

## Quy tắc nghiêm ngặt
1. **Căn cứ (Grounding)**: CHỈ sử dụng các sự thật từ Cơ sở Kiến thức. Nếu không có thông tin, bạn PHẢI nói rằng bạn không có thông tin đó.
2. **Phân tích lỗ hổng (Gap Analysis)**: Nếu câu hỏi yêu cầu chi tiết cụ thể mà bạn không có, bạn PHẢI đưa ra câu hỏi làm rõ.
3. **Ngôn ngữ**: Trả lời bằng tiếng Việt.

## Ngữ cảnh hiện tại
- **Ý định**: {intent}
- **Kỹ năng**: {skill}
- **Lịch sử hội thoại**: {conversation_history}

## Hướng dẫn cụ thể theo kỹ năng
{skill_instructions}

## Cơ sở kiến thức
{context}

## Tin nhắn người dùng
"{user_message}"

## Định dạng đầu ra (Chỉ JSON)
Nếu CÓ THỂ trả lời đầy đủ:
{
  "response_type": "final_answer",
  "need_more_info": false,
  "missing_info_fields": null,
  "message": "Câu trả lời dự thảo",
  "used_sources": ["source_id_1"],
  "reasoning_level": "shallow" | "medium" | "deep"
}

Nếu CẦN thêm thông tin:
{
  "response_type": "ask_clarification",
  "need_more_info": true,
  "missing_info_fields": ["thông_tin_còn_thiếu"],
  "message": "Câu hỏi làm rõ",
  "used_sources": [],
  "reasoning_level": "deep"
}`,
    description: 'Adaptive reasoning prompt',
  },
  response_strategy: {
    content: `Bạn là công cụ định dạng tin nhắn cho chatbot tuyển sinh của Trường Đại học Việt Nhật.

## Hình mẫu (Persona)
- Tư vấn viên tuyển sinh thân thiện
- Thấu hiểu và dễ tiếp cận

## Quy tắc
1. Chia câu trả lời thành 2-3 tin nhắn ngắn.
2. Tin nhắn đầu tiên: Ghi nhận/thấu hiểu.
3. Tin nhắn cuối: Lời kêu gọi hành động (CTA).
4. Giữ mỗi tin nhắn dưới 300 ký tự.
5. Sử dụng tiếng Việt tự nhiên.

## Đầu vào
- Loại phản hồi: {response_type}
- Ý định: {intent}
- Tin nhắn thô: "{raw_message}"

## Định dạng đầu ra (Chỉ JSON)
{
  "messages": [
    { "type": "empathy", "content": "..." },
    { "type": "main_answer", "content": "..." },
    { "type": "cta", "content": "..." }
  ],
  "quick_replies": ["Lựa chọn 1", "Lựa chọn 2"] | null
}`,
    description: 'Response strategy prompt for formatting messages',
  },
}

const RESPONSE_STRATEGIES = [
  {
    code: 'default_clarification',
    skillCode: null,
    trigger: 'ask_clarification',
    strategyText:
      'Đưa ra câu hỏi làm rõ ngắn gọn, tập trung vào một thông tin quan trọng nhất.',
    priority: 10,
    enabled: true,
  },
  {
    code: 'final_answer_standard',
    skillCode: null,
    trigger: 'final_answer',
    strategyText: 'Trả lời trực tiếp với CTA mời người dùng đặt thêm câu hỏi.',
    priority: 5,
    enabled: true,
  },
]

CORE_PROMPTS.reasoning = {
  content: ADAPTIVE_REASONING_PROMPT,
  description: 'Adaptive reasoning prompt',
}

CORE_PROMPTS.adaptive_reasoning = {
  content: ADAPTIVE_REASONING_PROMPT,
  description: 'Adaptive reasoning prompt',
}

function extractPromptFromFile(filePath: string): string {
  const content = fs.readFileSync(filePath, 'utf-8')
  const match = content.match(/export\s+const\s+\w+\s*=\s*`([\s\S]*?)`;?/)
  if (match) return match[1].trim()
  return content
}

async function seedSkills() {
  const repo = AppDataSource.getRepository(SkillEntity)
  console.log('Seeding skills...')

  for (const [code, file] of Object.entries(SKILL_FILES)) {
    const filePath = path.join(__dirname, '..', 'prompts', 'skills', file)
    const systemPrompt = extractPromptFromFile(filePath)

    await repo.upsert(
      {
        code,
        name: code.replace('_skill', '').replace(/_/g, ' '),
        description: `Skill for ${code}`,
        systemPrompt,
        enabled: true,
        version: 1,
      },
      ['code'],
    )
    console.log(`Upserted skill: ${code}`)
  }
}

async function seedCorePrompts() {
  const repo = AppDataSource.getRepository(CorePromptEntity)
  console.log('Seeding core prompts...')

  for (const [code, { content, description }] of Object.entries(CORE_PROMPTS)) {
    await repo.upsert({ code, content, description }, ['code'])
    console.log(`Upserted core prompt: ${code}`)
  }
}

async function seedResponseStrategies() {
  const repo = AppDataSource.getRepository(ResponseStrategyEntity)
  console.log('Seeding response strategies...')

  for (const strategy of RESPONSE_STRATEGIES) {
    await repo.upsert(strategy, ['code'])
    console.log(`Upserted response strategy: ${strategy.code}`)
  }
}

async function seedDocuments() {
  const repo = AppDataSource.getRepository(DocumentEntity)
  console.log('Seeding documents...')

  const dataDir = path.join(__dirname, '..', 'knowledge-base', 'data')
  const files = [
    'faq.json',
    'admissions.md',
    'tuition.md',
    'majors.md',
    'scholarships.md',
  ]

  for (const file of files) {
    const filePath = path.join(dataDir, file)
    if (!fs.existsSync(filePath)) {
      console.warn(`File not found: ${filePath}`)
      continue
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const type = file.endsWith('.json') ? 'faq' : file.replace('.md', '')

    await repo.upsert(
      {
        type,
        source: file,
        content,
        enabled: true,
      },
      ['type', 'source'],
    )
    console.log(`Upserted document: ${file}`)
  }
}

async function main() {
  console.log('Connecting to database...')
  await AppDataSource.initialize()
  console.log('Connected.')

  try {
    await seedSkills()
    await seedCorePrompts()
    await seedResponseStrategies()
    await seedDocuments()
    console.log('Seed completed successfully!')
  } catch (error) {
    console.error('Seed failed:', error)
  } finally {
    await AppDataSource.destroy()
  }
}

main()
