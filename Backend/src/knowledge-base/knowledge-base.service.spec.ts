import { Test, TestingModule } from '@nestjs/testing'
import { getRepositoryToken } from '@nestjs/typeorm'
import { KnowledgeBaseService } from './knowledge-base.service'
import { DocumentEntity } from '../database/entities'
import { EmbeddingService } from './embedding.service'
import { SanitizeService } from './sanitize.service'
import { SKILLS } from '../common/constants'
import { KnowledgeSearchResult } from './knowledge-base.types'

describe('KnowledgeBaseService', () => {
  let service: KnowledgeBaseService
  let mockRepo: any
  let mockEmbedding: any
  let mockSanitize: any

  const mockQueryBuilder = {
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    setParameter: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  }

  beforeEach(async () => {
    // Reset mock between tests
    mockQueryBuilder.where.mockClear()
    mockQueryBuilder.andWhere.mockClear()
    mockQueryBuilder.orderBy.mockClear()
    mockQueryBuilder.setParameter.mockClear()
    mockQueryBuilder.limit.mockClear()
    mockQueryBuilder.getMany.mockReset()

    mockRepo = {
      createQueryBuilder: jest.fn(() => mockQueryBuilder),
    }
    mockEmbedding = {
      embed: jest.fn(),
    }
    mockSanitize = {
      sanitizeForStorage: jest.fn(c => c),
      wrapForLlm: jest.fn((c, s) => `[KB: ${s}]\n${c}`),
    }

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KnowledgeBaseService,
        { provide: getRepositoryToken(DocumentEntity), useValue: mockRepo },
        { provide: EmbeddingService, useValue: mockEmbedding },
        { provide: SanitizeService, useValue: mockSanitize },
      ],
    }).compile()

    service = module.get<KnowledgeBaseService>(KnowledgeBaseService)
  })

  describe('search (DB path)', () => {
    it('should embed query and search DB', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1, 0.2, 0.3])
      mockQueryBuilder.getMany.mockResolvedValue([
        { content: 'Tuition content', source: 'tuition.md', type: 'tuition' },
      ])

      const result = await service.search('Học phí ngành IT')

      expect(mockEmbedding.embed).toHaveBeenCalledWith('Học phí ngành IT')
      expect(mockRepo.createQueryBuilder).toHaveBeenCalledWith('d')
      expect(result).toHaveLength(1)
    })

    it('should filter by type when skill is tuition', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])

      await service.search('học phí', SKILLS.TUITION)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.type = :type', {
        type: 'tuition',
      })
    })

    it('should filter by type when skill is major_info', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])

      await service.search('ngành CNTT', SKILLS.MAJOR_INFO)

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.type = :type', {
        type: 'majors',
      })
    })

    it('should not filter by type when skill is null', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])

      await service.search('test', undefined)

      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled()
    })

    it('should wrap content with SanitizeService', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([
        { content: 'raw content', source: 'tuition.md' },
      ])

      const result = await service.search('test')

      expect(mockSanitize.wrapForLlm).toHaveBeenCalledWith(
        'raw content',
        'tuition.md',
      )
      expect(result[0].content).toContain('[KB: tuition.md]')
    })

    it('should return empty array when DB has no results', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])

      const result = await service.search('unknown')
      expect(result).toEqual([])
    })
  })

  describe('skillToType mapping', () => {
    it('should map TUITION to "tuition"', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])
      await service.search('test', SKILLS.TUITION)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.type = :type', {
        type: 'tuition',
      })
    })

    it('should map SCHOLARSHIP to "scholarships"', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])
      await service.search('test', SKILLS.SCHOLARSHIP)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.type = :type', {
        type: 'scholarships',
      })
    })

    it('should map FAQ to "faq"', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])
      await service.search('test', SKILLS.FAQ)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.type = :type', {
        type: 'faq',
      })
    })

    it('should map CAREER_CONSULTING to "majors" (shares with major_info)', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])
      await service.search('test', SKILLS.CAREER_CONSULTING)
      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith('d.type = :type', {
        type: 'majors',
      })
    })

    it('should return null type for unknown skill', async () => {
      mockEmbedding.embed.mockResolvedValue([0.1])
      mockQueryBuilder.getMany.mockResolvedValue([])
      await service.search('test', 'unknown_skill')
      expect(mockQueryBuilder.andWhere).not.toHaveBeenCalled()
    })
  })

  describe('fallback (when DB fails)', () => {
    it('should fall back to file-based search when DB throws', async () => {
      mockEmbedding.embed.mockRejectedValue(new Error('DB connection failed'))

      const result = await service.search('Học phí', SKILLS.TUITION)

      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)
    })
  })
})
