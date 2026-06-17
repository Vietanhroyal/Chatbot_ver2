import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { CorePromptEntity } from '../database/entities';
import { CLARIFICATION_RESOLUTION_PROMPT } from '../prompts/clarification-resolution.prompt';
import { ADAPTIVE_REASONING_PROMPT } from '../prompts/reasoning.prompt';
import { INTENT_DETECTION_PROMPT } from '../prompts/intent-detection.prompt';
import { RESPONSE_STRATEGY_PROMPT } from '../prompts/response-strategy.prompt';

const HARDCODED_PROMPTS: Record<string, string> = {
  clarification_resolution: CLARIFICATION_RESOLUTION_PROMPT,
  reasoning: ADAPTIVE_REASONING_PROMPT,
  intent_detection: INTENT_DETECTION_PROMPT,
  response_strategy: RESPONSE_STRATEGY_PROMPT,
  adaptive_reasoning: ADAPTIVE_REASONING_PROMPT,
};

interface CacheEntry {
  data: string;
  ts: number;
}

@Injectable()
export class CorePromptsService {
  private readonly logger = new Logger(CorePromptsService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 60_000;

  constructor(
    @InjectRepository(CorePromptEntity)
    private repo: Repository<CorePromptEntity>,
    private configService: ConfigService,
  ) {}

  async getByCodeOrFallback(
    code: string,
    fallback: string,
  ): Promise<string> {
    const useDb = this.configService.get<boolean>('USE_DB_PROMPTS', false);

    if (useDb) {
      try {
        const cached = this.cache.get(code);
        if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
          return cached.data;
        }

        const entity = await this.repo.findOne({ where: { code } });
        if (entity?.content) {
          this.cache.set(code, { data: entity.content, ts: Date.now() });
          return entity.content;
        }
      } catch (err) {
        this.logger.warn(
          `DB read failed for core_prompts[${code}], using fallback`,
          err,
        );
      }
    }

    return fallback;
  }

  async getConfigByCodeOrFallback<T extends object>(
    code: string,
    fallback: T,
  ): Promise<T> {
    const useDb = this.configService.get<boolean>('USE_DB_PROMPTS', false);

    if (useDb) {
      try {
        const cached = this.cache.get(code);
        if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
          return JSON.parse(cached.data) as T;
        }

        const entity = await this.repo.findOne({ where: { code } });
        if (entity?.content) {
          const parsed = JSON.parse(entity.content) as T;
          this.cache.set(code, { data: entity.content, ts: Date.now() });
          return parsed;
        }
      } catch (err) {
        this.logger.warn(
          `DB read failed for core_prompts[${code}], using fallback`,
          err,
        );
      }
    }

    return fallback;
  }

  async getByCode(code: string): Promise<string> {
    const useDb = this.configService.get<boolean>('USE_DB_PROMPTS', false);

    if (useDb) {
      try {
        const prompt = await this.dbGetByCode(code);
        if (prompt) return prompt;
      } catch (err) {
        this.logger.warn(`DB read failed for core prompt ${code}, using fallback`);
      }
    }

    return this.getHardcodedPrompt(code);
  }

  private async dbGetByCode(code: string): Promise<string | null> {
    const cached = this.cache.get(code);
    if (cached && Date.now() - cached.ts < this.CACHE_TTL) {
      return cached.data;
    }

    const prompt = await this.repo.findOne({ where: { code } });
    if (!prompt) return null;

    this.cache.set(code, { data: prompt.content, ts: Date.now() });
    return prompt.content;
  }

  private getHardcodedPrompt(code: string): string {
    return HARDCODED_PROMPTS[code] ?? '';
  }

  invalidateCache(code?: string): void {
    if (code) this.cache.delete(code);
    else this.cache.clear();
  }
}