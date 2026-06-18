import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { SkillsService } from './skills.service'
import { SkillEntity } from '../database/entities'

describe('SkillsService', () => {
  let service: SkillsService
  let mockRepo: any

  const FALLBACK_MAP = {
    faq_skill: 'Fallback FAQ instructions',
    tuition_explanation_skill: 'Fallback tuition instructions',
  }

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SkillsService,
        { provide: getRepositoryToken(SkillEntity), useValue: mockRepo },
      ],
    }).compile()

    service = module.get<SkillsService>(SkillsService)
    service.invalidateCache() // Clear cache between tests
  })

  describe('getSystemPromptOrFallback', () => {
    it('should return from DB when skill exists', async () => {
      mockRepo.findOne.mockResolvedValue({
        code: 'faq_skill',
        systemPrompt: 'DB FAQ instructions',
        version: 1,
        enabled: true,
      })
      const result = await service.getSystemPromptOrFallback(
        'faq_skill',
        FALLBACK_MAP,
      )
      expect(result).toBe('DB FAQ instructions')
    })

    it('should return fallback when skill not in DB', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await service.getSystemPromptOrFallback(
        'faq_skill',
        FALLBACK_MAP,
      )
      expect(result).toBe('Fallback FAQ instructions')
    })

    it('should return default message when skill not in DB and not in fallback', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await service.getSystemPromptOrFallback(
        'unknown_skill',
        FALLBACK_MAP,
      )
      expect(result).toBe('Answer based on the knowledge base.')
    })

    it('should return fallback when DB throws error', async () => {
      mockRepo.findOne.mockRejectedValue(new Error('DB down'))
      const result = await service.getSystemPromptOrFallback(
        'faq_skill',
        FALLBACK_MAP,
      )
      expect(result).toBe('Fallback FAQ instructions')
    })

    it('should skip disabled skills in DB', async () => {
      mockRepo.findOne.mockResolvedValue({
        code: 'faq_skill',
        systemPrompt: 'DB FAQ instructions',
        enabled: false,
      })
      const result = await service.getSystemPromptOrFallback(
        'faq_skill',
        FALLBACK_MAP,
      )
      expect(result).toBe('Fallback FAQ instructions')
    })

    it('should cache DB result for subsequent calls', async () => {
      mockRepo.findOne.mockResolvedValue({
        code: 'faq_skill',
        systemPrompt: 'DB FAQ instructions',
        enabled: true,
        version: 1,
      })

      await service.getSystemPromptOrFallback('faq_skill', FALLBACK_MAP)
      await service.getSystemPromptOrFallback('faq_skill', FALLBACK_MAP)

      expect(mockRepo.findOne).toHaveBeenCalledTimes(1)
    })

    it('should cache different skills separately', async () => {
      mockRepo.findOne.mockImplementation(({ where }: any) => {
        if (where.code === 'faq_skill') {
          return Promise.resolve({
            systemPrompt: 'FAQ',
            enabled: true,
            version: 1,
          })
        }
        return Promise.resolve({
          systemPrompt: 'TUITION',
          enabled: true,
          version: 1,
        })
      })

      const r1 = await service.getSystemPromptOrFallback(
        'faq_skill',
        FALLBACK_MAP,
      )
      const r2 = await service.getSystemPromptOrFallback(
        'tuition_explanation_skill',
        FALLBACK_MAP,
      )

      expect(r1).toBe('FAQ')
      expect(r2).toBe('TUITION')
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2)
    })
  })

  describe('invalidateCache', () => {
    it('should clear specific skill from cache', async () => {
      mockRepo.findOne.mockResolvedValue({
        systemPrompt: 'FAQ',
        enabled: true,
        version: 1,
      })
      await service.getSystemPromptOrFallback('faq_skill', FALLBACK_MAP)
      service.invalidateCache('faq_skill')
      await service.getSystemPromptOrFallback('faq_skill', FALLBACK_MAP)
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2)
    })

    it('should clear all cache when no code provided', async () => {
      mockRepo.findOne.mockResolvedValue({
        systemPrompt: 'FAQ',
        enabled: true,
        version: 1,
      })
      await service.getSystemPromptOrFallback('faq_skill', FALLBACK_MAP)
      service.invalidateCache()
      await service.getSystemPromptOrFallback('faq_skill', FALLBACK_MAP)
      expect(mockRepo.findOne).toHaveBeenCalledTimes(2)
    })
  })

  describe('getFallbackMap', () => {
    it('should return map with all required skills', async () => {
      const map = await service.getFallbackMap()
      expect(map['faq_skill']).toBeDefined()
      expect(map['tuition_explanation_skill']).toBeDefined()
      expect(map['major_information_skill']).toBeDefined()
      expect(map['career_consulting_skill']).toBeDefined()
      expect(map['persuasion_skill']).toBeDefined()
      expect(map['human_handoff_skill']).toBeDefined()
    })
  })
})
