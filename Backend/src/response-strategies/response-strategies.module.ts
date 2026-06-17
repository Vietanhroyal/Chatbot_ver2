import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ResponseStrategyEntity } from '../database/entities'
import { ResponseStrategiesService } from './response-strategies.service'

@Module({
  imports: [TypeOrmModule.forFeature([ResponseStrategyEntity])],
  providers: [ResponseStrategiesService],
  exports: [ResponseStrategiesService],
})
export class ResponseStrategiesModule {}