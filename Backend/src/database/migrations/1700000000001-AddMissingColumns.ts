import { MigrationInterface, QueryRunner } from 'typeorm'

/**
 * Migration 2: Idempotent fixup for deployments where the initial migration
 * was only partially applied (e.g. the `documents` table was created manually
 * without all columns, or the other tables were never created).
 *
 * Uses IF NOT EXISTS / IF NOT EXISTS on columns so it is safe to re-run.
 */
export class AddMissingColumns1700000000001 implements MigrationInterface {
  name = 'AddMissingColumns1700000000001'

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Ensure pgvector extension is present (harmless if already installed)
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS vector`)

    // ── skills ───────────────────────────────────────────────────────────
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

    // ── core_prompts ──────────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "core_prompts" (
        "id" SERIAL PRIMARY KEY,
        "code" VARCHAR(64) UNIQUE NOT NULL,
        "content" TEXT NOT NULL,
        "description" TEXT,
        "updated_at" TIMESTAMPTZ DEFAULT NOW()
      )
    `)

    // ── response_strategies ───────────────────────────────────────────────
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

    // ── documents ─────────────────────────────────────────────────────────
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

    // Add any columns that might be missing from a partial table creation
    await queryRunner.query(`
      ALTER TABLE "documents"
        ADD COLUMN IF NOT EXISTS "enabled" BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS "metadata" JSONB,
        ADD COLUMN IF NOT EXISTS "embedding" TEXT,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT NOW()
    `)

    // Indexes
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_documents_type" ON "documents" ("type")`,
    )
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "idx_documents_enabled" ON "documents" ("enabled")`,
    )
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Only drop what this migration exclusively created
    // (the primary tables are covered by migration 1)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_enabled"`)
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_documents_type"`)
  }
}
