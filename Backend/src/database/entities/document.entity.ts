import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm'

const vectorTransformer = {
  to: (value: number[] | null): string | null => {
    if (!value) return null
    return `[${value.join(',')}]`
  },
  from: (value: string | null): number[] | null => {
    if (!value) return null
    return value.slice(1, -1).split(',').map(Number)
  },
}

@Entity('documents')
export class DocumentEntity {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 32 })
  type: string

  @Column({ length: 128, nullable: true })
  source: string

  @Column({ type: 'text' })
  content: string

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>

  @Column({ type: 'text', nullable: true, transformer: vectorTransformer })
  embedding: number[]

  @Column({ default: true })
  enabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}
