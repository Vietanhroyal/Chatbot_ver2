import { Injectable, Logger, OnModuleInit } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as fs from 'fs'
import * as path from 'path'
import { SKILLS } from '../common/constants'
import { FaqEntry, KnowledgeSearchResult } from './knowledge-base.types'
import { DocumentEntity } from '../database/entities/document.entity'
import { EmbeddingService } from './embedding.service'
import { SanitizeService } from './sanitize.service'

@Injectable()
export class KnowledgeBaseService implements OnModuleInit {
  private readonly logger = new Logger(KnowledgeBaseService.name)

  private faqData: FaqEntry[] = []
  private admissionsData = ''
  private tuitionData = ''
  private majorsData = ''
  private scholarshipsData = ''

  constructor(
    @InjectRepository(DocumentEntity)
    private documentsRepo: Repository<DocumentEntity>,
    private embeddingService: EmbeddingService,
    private sanitizeService: SanitizeService,
  ) {}

  onModuleInit() {
    this.loadAllData()
  }

  async search(
    query: string,
    skill?: string,
  ): Promise<KnowledgeSearchResult[]> {
    this.logger.log(`Searching KB | skill=${skill} | query="${query}"`)

    try {
      return await this.searchFromDb(query, skill)
    } catch (err) {
      this.logger.warn(`DB search failed: ${err}, falling back to file-based`)
      return this.searchFromFiles(query, skill)
    }
  }

  private async searchFromDb(
    query: string,
    skill?: string,
  ): Promise<KnowledgeSearchResult[]> {
    const queryEmbedding = await this.embeddingService.embed(query)
    const type = this.skillToType(skill)

    const qb = this.documentsRepo
      .createQueryBuilder('d')
      .where('d.enabled = :enabled', { enabled: true })

    if (type) {
      qb.andWhere('d.type = :type', { type })
    }

    const docs = await qb
      .orderBy('d.embedding <=> :embedding', 'ASC')
      .setParameter('embedding', queryEmbedding)
      .limit(5)
      .getMany()

    return docs.map(d => ({
      content: this.sanitizeService.wrapForLlm(d.content, d.source ?? ''),
      source: d.source ?? '',
    }))
  }

  private skillToType(skill?: string): string | null {
    if (!skill) return null
    const map: Record<string, string> = {
      [SKILLS.TUITION]: 'tuition',
      [SKILLS.MAJOR_INFO]: 'majors',
      [SKILLS.CAREER_CONSULTING]: 'majors',
      [SKILLS.SCHOLARSHIP]: 'scholarships',
      [SKILLS.FAQ]: 'faq',
    }
    return map[skill] ?? null
  }

  private searchFromFiles(
    query: string,
    skill?: string,
  ): KnowledgeSearchResult[] {
    switch (skill) {
      case SKILLS.TUITION:
        return [{ content: this.tuitionData, source: 'tuition.md' }]

      case SKILLS.MAJOR_INFO:
      case SKILLS.CAREER_CONSULTING:
        return [{ content: this.majorsData, source: 'majors.md' }]

      case SKILLS.SCHOLARSHIP:
        return [{ content: this.scholarshipsData, source: 'scholarships.md' }]

      case SKILLS.FAQ:
        return this.searchFaq(query)

      default:
        return this.searchAll(query)
    }
  }

  private searchFaq(query: string): KnowledgeSearchResult[] {
    const lowerQuery = query.toLowerCase()
    const matches = this.faqData.filter(
      entry =>
        entry.question.toLowerCase().includes(lowerQuery) ||
        entry.answer.toLowerCase().includes(lowerQuery),
    )

    if (matches.length === 0) {
      return this.faqData.map(entry => ({
        content: `Q: ${entry.question}\nA: ${entry.answer}`,
        source: `faq.json#${entry.id}`,
      }))
    }

    return matches.map(entry => ({
      content: `Q: ${entry.question}\nA: ${entry.answer}`,
      source: `faq.json#${entry.id}`,
    }))
  }

  private searchAll(query: string): KnowledgeSearchResult[] {
    const results: KnowledgeSearchResult[] = []
    const lowerQuery = query.toLowerCase()

    const sources = [
      { data: this.tuitionData, name: 'tuition.md' },
      { data: this.majorsData, name: 'majors.md' },
      { data: this.admissionsData, name: 'admissions.md' },
      { data: this.scholarshipsData, name: 'scholarships.md' },
    ]

    for (const source of sources) {
      if (source.data.toLowerCase().includes(lowerQuery)) {
        results.push({ content: source.data, source: source.name })
      }
    }

    const faqResults = this.searchFaq(query)
    results.push(...faqResults)

    return results
  }

  private loadAllData(): void {
    this.faqData = this.loadJson<FaqEntry[]>('faq.json', [])
    this.admissionsData = this.loadMarkdown('admissions.md')
    this.tuitionData = this.loadMarkdown('tuition.md')
    this.majorsData = this.loadMarkdown('majors.md')
    this.scholarshipsData = this.loadMarkdown('scholarships.md')

    this.logger.log(
      `Knowledge Base loaded: ${this.faqData.length} FAQs, ` +
        `${
          [
            this.admissionsData,
            this.tuitionData,
            this.majorsData,
            this.scholarshipsData,
          ].filter(Boolean).length
        } documents`,
    )
  }

  private loadJson<T>(filename: string, fallback: T): T {
    try {
      const filePath = path.join(__dirname, 'data', filename)
      if (!fs.existsSync(filePath)) {
        const devPath = path.join(
          process.cwd(),
          'src',
          'knowledge-base',
          'data',
          filename,
        )
        if (fs.existsSync(devPath)) {
          const raw = fs.readFileSync(devPath, 'utf-8')
          return JSON.parse(raw) as T
        }
        this.logger.warn(`File not found: ${filePath} or ${devPath}`)
        return fallback
      }
      const raw = fs.readFileSync(filePath, 'utf-8')
      return JSON.parse(raw) as T
    } catch (error) {
      this.logger.warn(`Failed to load ${filename}: ${error}`)
      return fallback
    }
  }

  private loadMarkdown(filename: string): string {
    try {
      const filePath = path.join(__dirname, 'data', filename)
      if (!fs.existsSync(filePath)) {
        const devPath = path.join(
          process.cwd(),
          'src',
          'knowledge-base',
          'data',
          filename,
        )
        if (fs.existsSync(devPath)) {
          return fs.readFileSync(devPath, 'utf-8')
        }
        return ''
      }
      return fs.readFileSync(filePath, 'utf-8')
    } catch (error) {
      this.logger.warn(`Failed to load ${filename}: ${error}`)
      return ''
    }
  }
}
