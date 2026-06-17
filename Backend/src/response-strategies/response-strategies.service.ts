import { Injectable, Logger } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ResponseStrategyEntity } from '../database/entities'

@Injectable()
export class ResponseStrategiesService {
  private readonly logger = new Logger(ResponseStrategiesService.name)

  constructor(
    @InjectRepository(ResponseStrategyEntity)
    private repo: Repository<ResponseStrategyEntity>,
  ) {}

  async getByIntent(intent: string): Promise<ResponseStrategyEntity | null> {
    return this.repo.findOne({
      where: { trigger: intent, enabled: true },
      order: { priority: 'DESC' },
    })
  }

  async getBySkill(skillCode: string): Promise<ResponseStrategyEntity[]> {
    return this.repo.find({
      where: { skillCode, enabled: true },
      order: { priority: 'DESC' },
    })
  }

  async getAllEnabled(): Promise<ResponseStrategyEntity[]> {
    return this.repo.find({
      where: { enabled: true },
      order: { priority: 'DESC' },
    })
  }
}