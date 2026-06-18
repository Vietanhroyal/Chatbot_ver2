import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('response_strategies')
export class ResponseStrategyEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 64 })
  code: string

  @Column({ name: 'skill_code', type: 'varchar', length: 64, nullable: true })
  skillCode: string | null

  @Column({ type: 'text', nullable: true })
  trigger: string

  @Column({ name: 'strategy_text', type: 'text' })
  strategyText: string

  @Column({ default: 0 })
  priority: number

  @Column({ default: true })
  enabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
