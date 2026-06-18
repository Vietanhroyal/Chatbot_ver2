import { MigrationInterface, QueryRunner } from 'typeorm'

export class Init1700000000000 implements MigrationInterface {
  name = 'Init1700000000000'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "skills" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(64) UNIQUE NOT NULL,
        "name" VARCHAR(128) NOT NULL,
        "description" TEXT,
        "system_prompt" TEXT NOT NULL,
        "enabled" BOOLEAN DEFAULT true,
        "version" INTEGER DEFAULT 1,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core_prompts" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(64) UNIQUE NOT NULL,
        "content" TEXT NOT NULL,
        "description" TEXT,
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "response_strategies" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(64) UNIQUE NOT NULL,
        "skill_code" VARCHAR(64),
        "trigger" TEXT,
        "strategy_text" TEXT NOT NULL,
        "priority" INTEGER DEFAULT 0,
        "enabled" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "documents" (
        "id" SERIAL PRIMARY KEY,
        "type" VARCHAR(32) NOT NULL,
        "source" VARCHAR(128),
        "content" TEXT NOT NULL,
        "metadata" JSONB,
        "embedding" TEXT,
        "enabled" BOOLEAN DEFAULT true,
        "created_at" TIMESTAMPTZ DEFAULT NOW(),
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // Patch any missing columns in case the table was created partially before migration
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS "metadata" JSONB,
        ADD COLUMN IF NOT EXISTS "embedding" TEXT,
        ADD COLUMN IF NOT EXISTS "source" VARCHAR(128),
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW()
    `)

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents" ("type")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_documents_enabled" ON "documents" ("enabled")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "documents"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "response_strategies"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "core_prompts"`)
    await queryRunner.query(`DROP TABLE IF EXISTS "skills"`)
    await queryRunner.query(`DROP EXTENSION IF EXISTS vector`)
  }
}
