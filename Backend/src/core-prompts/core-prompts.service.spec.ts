import { Test, TestingModule } from '@nestjs/testing'
import { ConfigService } from '@nestjs/config'
import { getRepositoryToken } from '@nestjs/typeorm'
import { CorePromptsService } from './core-prompts.service'
import { CorePromptEntity } from '../database/entities'
import { CLARIFICATION_RESOLUTION_PROMPT } from '../prompts/clarification-resolution.prompt'
import { ADAPTIVE_REASONING_PROMPT } from '../prompts/reasoning.prompt'
import { INTENT_DETECTION_PROMPT } from '../prompts/intent-detection.prompt'
import { RESPONSE_STRATEGY_PROMPT } from '../prompts/response-strategy.prompt'

describe('CorePromptsService', () => {
  let service: CorePromptsService
  let mockRepo: any
  let mockConfig: any

  const FALLBACK = 'FALLBACK_PROMPT'

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
    }
    mockConfig = {
      get: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CorePromptsService,
        { provide: getRepositoryToken(CorePromptEntity), useValue: mockRepo },
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile()

    service = module.get<CorePromptsService>(CorePromptsService)
  })

  describe('getByCodeOrFallback', () => {
    it('should return fallback when USE_DB_PROMPTS=false', async () => {
      mockConfig.get.mockReturnValue(false)
      const result = await service.getByCodeOrFallback(
        'intent_detection',
        FALLBACK,
      )
      expect(result).toBe(FALLBACK)
      expect(mockRepo.findOne).not.toHaveBeenCalled()
    })

    it('should return from DB when USE_DB_PROMPTS=true', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockResolvedValue({
        code: 'intent_detection',
        content: 'DB_PROMPT',
      })
      const result = await service.getByCodeOrFallback(
        'intent_detection',
        FALLBACK,
      )
      expect(result).toBe('DB_PROMPT')
    })

    it('should return fallback when DB has no record', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockResolvedValue(null)
      const result = await service.getByCodeOrFallback(
        'intent_detection',
        FALLBACK,
      )
      expect(result).toBe(FALLBACK)
    })

    it('should return fallback when DB throws error', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockRejectedValue(new Error('DB down'))
      const result = await service.getByCodeOrFallback(
        'intent_detection',
        FALLBACK,
      )
      expect(result).toBe(FALLBACK)
    })

    it('should cache DB result and not call DB twice', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockResolvedValue({
        code: 'intent_detection',
        content: 'DB_PROMPT',
      })

      await service.getByCodeOrFallback('intent_detection', FALLBACK)
      await service.getByCodeOrFallback('intent_detection', FALLBACK)

      expect(mockRepo.findOne).toHaveBeenCalledTimes(1)
    })

    it('should refetch after cache is invalidated', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockResolvedValue({
        code: 'intent_detection',
        content: 'DB_PROMPT',
      })

      await service.getByCodeOrFallback('intent_detection', FALLBACK)
      service.invalidateCache('intent_detection')
      await service.getByCodeOrFallback('intent_detection', FALLBACK)

      expect(mockRepo.findOne).toHaveBeenCalledTimes(2)
    })
  })

  describe('getConfigByCodeOrFallback', () => {
    it('should parse JSON content from DB', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockResolvedValue({
        code: 'response_packaging',
        content: JSON.stringify({ maxMessageLength: 1000 }),
      })

      const fallback = { maxMessageLength: 500 }
      const result = await service.getConfigByCodeOrFallback(
        'response_packaging',
        fallback,
      )
      expect(result).toEqual({ maxMessageLength: 1000 })
    })

    it('should return fallback when USE_DB_PROMPTS=false', async () => {
      mockConfig.get.mockReturnValue(false)
      const fallback = { maxMessageLength: 500 }
      const result = await service.getConfigByCodeOrFallback(
        'response_packaging',
        fallback,
      )
      expect(result).toEqual(fallback)
    })

    it('should return fallback when DB content is invalid JSON', async () => {
      mockConfig.get.mockReturnValue(true)
      mockRepo.findOne.mockResolvedValue({
        code: 'response_packaging',
        content: 'not-json',
      })
      const fallback = { maxMessageLength: 500 }
      const result = await service.getConfigByCodeOrFallback(
        'response_packaging',
        fallback,
      )
      expect(result).toEqual(fallback)
    })
  })

  describe('hardcoded prompts content (regression)', () => {
    it('intent_detection fallback should match file content', () => {
      expect(INTENT_DETECTION_PROMPT).toBeDefined()
      expect(INTENT_DETECTION_PROMPT).toContain('tuition_inquiry')
    })

    it('adaptive_reasoning fallback should match file content', () => {
      expect(ADAPTIVE_REASONING_PROMPT).toBeDefined()
      expect(ADAPTIVE_REASONING_PROMPT).toContain('{user_message}')
    })

    it('clarification_resolution fallback should match file content', () => {
      expect(CLARIFICATION_RESOLUTION_PROMPT).toBeDefined()
      expect(CLARIFICATION_RESOLUTION_PROMPT).toContain('resolved')
    })

    it('response_strategy fallback should match file content', () => {
      expect(RESPONSE_STRATEGY_PROMPT).toBeDefined()
      expect(RESPONSE_STRATEGY_PROMPT).toContain('messages')
    })
  })
})
