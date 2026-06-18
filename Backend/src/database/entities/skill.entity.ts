import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('skills')
export class SkillEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 64 })
  code: string

  @Column({ length: 128 })
  name: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ name: 'system_prompt', type: 'text' })
  systemPrompt: string

  @Column({ default: true })
  enabled: boolean

  @Column({ default: 1 })
  version: number

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
