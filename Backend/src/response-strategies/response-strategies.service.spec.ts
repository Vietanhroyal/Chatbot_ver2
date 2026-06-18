import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { ResponseStrategiesService } from './response-strategies.service'
import { ResponseStrategyEntity } from '../database/entities'

describe('ResponseStrategiesService', () => {
  let service: ResponseStrategiesService
  let mockRepo: any

  beforeEach(async () => {
    mockRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResponseStrategiesService,
        {
          provide: getRepositoryToken(ResponseStrategyEntity),
          useValue: mockRepo,
        },
      ],
    }).compile()

    service = module.get<ResponseStrategiesService>(ResponseStrategiesService)
  })

  describe('getByIntent', () => {
    it('should call findOne with correct params', async () => {
      mockRepo.findOne.mockResolvedValue({
        code: 'final_answer_standard',
        strategyText: 'Be concise',
      })

      const result = await service.getByIntent('tuition_inquiry')

      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { trigger: 'tuition_inquiry', enabled: true },
        order: { priority: 'DESC' },
      })
      expect(result?.code).toBe('final_answer_standard')
    })

    it('should return null when no strategy found', async () => {
      mockRepo.findOne.mockResolvedValue(null)
      const result = await service.getByIntent('unknown_intent')
      expect(result).toBeNull()
    })
  })

  describe('getBySkill', () => {
    it('should return strategies for a skill, sorted by priority', async () => {
      mockRepo.find.mockResolvedValue([
        { code: 's1', skillCode: 'tuition_skill', priority: 10 },
        { code: 's2', skillCode: 'tuition_skill', priority: 5 },
      ])

      const result = await service.getBySkill('tuition_skill')

      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { skillCode: 'tuition_skill', enabled: true },
        order: { priority: 'DESC' },
      })
      expect(result).toHaveLength(2)
    })

    it('should return empty array when no strategy for skill', async () => {
      mockRepo.find.mockResolvedValue([])
      const result = await service.getBySkill('unknown_skill')
      expect(result).toEqual([])
    })
  })

  describe('getAllEnabled', () => {
    it('should return all enabled strategies sorted by priority', async () => {
      mockRepo.find.mockResolvedValue([
        { code: 's1', priority: 10, enabled: true },
        { code: 's2', priority: 5, enabled: true },
      ])
      const result = await service.getAllEnabled()
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { enabled: true },
        order: { priority: 'DESC' },
      })
      expect(result).toHaveLength(2)
    })
  })
})
