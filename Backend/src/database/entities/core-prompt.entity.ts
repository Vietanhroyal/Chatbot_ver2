import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

@Entity('core_prompts')
export class CorePromptEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ unique: true, length: 64 })
  code: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'text', nullable: true })
  description: string

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
