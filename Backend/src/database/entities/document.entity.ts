import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm'

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

  @Column('float', { array: true, nullable: true })
  embedding: number[]

  @Column({ default: true })
  enabled: boolean

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt: Date
}