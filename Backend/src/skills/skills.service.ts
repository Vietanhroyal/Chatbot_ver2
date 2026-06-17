import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ConfigService } from '@nestjs/config'
import { SkillEntity } from '../database/entities'
import { SKILLS } from '../common/constants'
import { FAQ_SKILL_INSTRUCTIONS } from '../prompts/skills/faq.prompt'
import { TUITION_SKILL_INSTRUCTIONS } from '../prompts/skills/tuition.prompt'
import { MAJOR_INFO_SKILL_INSTRUCTIONS } from '../prompts/skills/major-info.prompt'
import { CAREER_CONSULTING_SKILL_INSTRUCTIONS } from '../prompts/skills/career-consulting.prompt'
import { PERSUASION_SKILL_INSTRUCTIONS } from '../prompts/skills/persuasion.prompt'
import { HUMAN_HANDOFF_SKILL_INSTRUCTIONS } from '../prompts/skills/human-handoff.prompt'

const HARDCODED_SKILL_MAP: Record<string, string> = {
  [SKILLS.FAQ]: FAQ_SKILL_INSTRUCTIONS,
  [SKILLS.TUITION]: TUITION_SKILL_INSTRUCTIONS,
  [SKILLS.MAJOR_INFO]: MAJOR_INFO_SKILL_INSTRUCTIONS,
  [SKILLS.CAREER_CONSULTING]: CAREER_CONSULTING_SKILL_INSTRUCTIONS,
  'persuasion_skill': PERSUASION_SKILL_INSTRUCTIONS,
  [SKILLS.HUMAN_HANDOFF]: HUMAN_HANDOFF_SKILL_INSTRUCTIONS,
}

interface CacheEntry {
  data: string
  version: number
  ts: number
}

@Injectable()
export class SkillsService {
  private readonly logger = new Logger(SkillsService.name)
  private cache = new Map<string, CacheEntry>()
  private readonly CACHE_TTL = 60_000

  constructor(
    @InjectRepository(SkillEntity)
    private repo: Repository<SkillEntity>,
    private configService: ConfigService,
  ) {}

  async getSystemPrompt(code: string): Promise<string> {
    const useDb = this.configService.get<boolean>('USE_DB_PROMPTS', false)

    if (useDb) {
      try {
        const prompt = await this.dbGetSystemPrompt(code)
        if (prompt) return prompt
      } catch (err) {
        this.logger.warn(`DB read failed for skill ${code}, using fallback`)
      }
    }

    return this.getHardcodedPrompt(code)
  }

  private async dbGetSystemPrompt(code: string): Promise<string | null> {
    const cached = this.cache.get(code)
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data
    }

    const skill = await this.repo.findOne({ where: { code, enabled: true } })
    if (!skill) return null

    this.cache.set(code, {
      data: skill.systemPrompt,
      version: skill.version,
      ts: Date.now(),
    })

    return skill.systemPrompt
  }

  private getHardcodedPrompt(code: string): string {
    return HARDCODED_SKILL_MAP[code] ?? 'Answer based on the knowledge base.'
  }

  invalidateCache(code?: string): void {
    if (code) this.cache.delete(code)
    else this.cache.clear()
  }
}