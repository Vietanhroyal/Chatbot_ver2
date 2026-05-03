# Detailed Execution Plan: `config/` Module

## Pre-requisites
- [ ] `common/` module is complete (types, constants, filter, interceptor)
- [ ] `npm run build` passes
- [ ] `npm run start:dev` starts without errors

---

## Phase 1: Install Dependencies
**Estimated Time:** 2 minutes

### Task 1.1: Install packages

```bash
npm install @nestjs/config joi
```

### Task 1.2: Create directory

```text
src/
└── config/
    ├── config.module.ts
    └── config.service.ts
```

### Task 1.3: Create `.env` and `.env.example` at project root

**`.env.example`** (committed to git):
```env
# ─── Application ────────────────────────────────
NODE_ENV=development // what it mean? 
PORT=3000

# ─── OpenAI ─────────────────────────────────────
OPENAI_API_KEY=sk-your-key-here

# ─── Database (Future Phase) ────────────────────
# DB_HOST=localhost
# DB_PORT=5432
# DB_NAME=chatbot
# DB_USER=postgres
# DB_PASSWORD=postgres
```

**`.env`** (gitignored — your local copy):
```env
NODE_ENV=development
PORT=3000
OPENAI_API_KEY=sk-your-actual-key
```

**Verification:** Both files exist at the project root.

---

## Phase 2: Config Module (`config.module.ts`)
**Estimated Time:** 10 minutes

### Task 2.1: Create `src/config/config.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { AppConfigService } from './config.service';

/**
 * Centralized configuration module.
 * - Loads environment variables from .env
 * - Validates required vars at startup (fail-fast)
 * - Registered globally so all modules can inject AppConfigService
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validationSchema: Joi.object({
        // ─── Application ───────────────────────────
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(3000),

        // ─── OpenAI ────────────────────────────────
        OPENAI_API_KEY: Joi.string().required().messages({
          'any.required': 'OPENAI_API_KEY is required in .env',
        }),

        // ─── Database (Future Phase) ───────────────
        // DB_HOST: Joi.string().default('localhost'),
        // DB_PORT: Joi.number().default(5432),
        // DB_NAME: Joi.string().required(),
        // DB_USER: Joi.string().required(),
        // DB_PASSWORD: Joi.string().required(),
      }),
      validationOptions: {
        abortEarly: true, // Stop at first error
      },
    }),
  ],
  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
```

### Task 2.2: Verify
- [ ] File compiles: `npm run build`.
- [ ] Remove `OPENAI_API_KEY` from `.env` → app should **crash on startup** with a Joi validation error.
- [ ] Re-add `OPENAI_API_KEY` → app starts normally.

---

## Phase 3: Config Service (`config.service.ts`)
**Estimated Time:** 10 minutes

### Task 3.1: Create `src/config/config.service.ts`

```typescript
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * Strongly-typed wrapper around NestJS ConfigService.
 *
 * Why: Eliminates magic strings like configService.get('OPENAI_API_KEY').
 * Every env var has an explicit getter with the correct return type.
 */
@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService) {}

  // ─── Application ─────────────────────────────────────────────

  get nodeEnv(): string {
    return this.configService.get<string>('NODE_ENV', 'development');
  }

  get isProduction(): boolean {
    return this.nodeEnv === 'production';
  }

  get isDevelopment(): boolean {
    return this.nodeEnv === 'development';
  }

  get port(): number {
    return this.configService.get<number>('PORT', 3000);
  }

  // ─── OpenAI ──────────────────────────────────────────────────

  get openAiApiKey(): string {
    return this.configService.getOrThrow<string>('OPENAI_API_KEY');
  }

  // ─── Database (Future Phase) ─────────────────────────────────
  // get dbHost(): string {
  //   return this.configService.get<string>('DB_HOST', 'localhost');
  // }
  // get dbPort(): number {
  //   return this.configService.get<number>('DB_PORT', 5432);
  // }
  // get dbName(): string {
  //   return this.configService.getOrThrow<string>('DB_NAME');
  // }
  // get dbUser(): string {
  //   return this.configService.getOrThrow<string>('DB_USER');
  // }
  // get dbPassword(): string {
  //   return this.configService.getOrThrow<string>('DB_PASSWORD');
  // }
}
```

### Task 3.2: Verify
- [ ] `npm run build` passes.
- [ ] No magic strings — all env access goes through typed getters.

---

## Phase 4: Register in `app.module.ts`
**Estimated Time:** 5 minutes

### Task 4.1: Update `src/app.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { AppConfigModule } from './config/config.module';
// ... other module imports later

@Module({
  imports: [
    AppConfigModule,
    // HealthModule,      ← next module
    // AiChatModule,      ← later
  ],
})
export class AppModule {}
```

### Task 4.2: Update `src/main.ts` to use `AppConfigService`

Replace the hardcoded port with the config service:

```typescript
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { AppConfigService } from './config/config.service';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { API_PREFIX } from './common/constants';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get typed config
  const configService = app.get(AppConfigService);

  app.setGlobalPrefix(API_PREFIX);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  const port = configService.port;
  await app.listen(port);
}
bootstrap();
```

### Task 4.3: Verify
- [ ] `npm run start:dev` starts on the correct port from `.env`.
- [ ] Console shows: `Nest application successfully started`.

---

## Phase 5: Add `.env` to `.gitignore`
**Estimated Time:** 1 minute

### Task 5.1: Verify `.gitignore` contains

```text
# Environment
.env
.env.local
```

> **Important:** `.env.example` should NOT be gitignored — it's the template.

---

## Phase 6: Smoke Test
**Estimated Time:** 5 minutes

### Task 6.1: Test fail-fast behavior

```bash
# 1. Remove OPENAI_API_KEY from .env
# 2. Try to start
npm run start:dev
# Expected: App crashes with Joi error: "OPENAI_API_KEY is required"

# 3. Restore OPENAI_API_KEY in .env
# 4. Start again
npm run start:dev
# Expected: App starts on the configured PORT
```

### Task 6.2: Test config injection

Temporarily add a log in any existing controller or service:

```typescript
constructor(private readonly config: AppConfigService) {
  console.log('ENV:', this.config.nodeEnv);
  console.log('PORT:', this.config.port);
  console.log('KEY exists:', !!this.config.openAiApiKey);
}
```

Verify the output shows correct values, then remove the temporary log.

### Task 6.3: Verify all acceptance criteria

- [ ] App crashes on startup if `OPENAI_API_KEY` is missing from `.env`.
- [ ] Default values work (`PORT` defaults to 3000, `NODE_ENV` defaults to `development`).
- [ ] No magic strings — all env access goes through `AppConfigService` getters.
- [ ] `AppConfigModule` is imported globally in `app.module.ts`.
- [ ] `.env` is gitignored, `.env.example` is committed.
- [ ] `npm run build` passes with zero TypeScript errors.

---

## Summary: Execution Order

```text
Phase 1  →  Install deps + create .env       (2 min)
Phase 2  →  config.module.ts (Joi schema)     (10 min)
Phase 3  →  config.service.ts (typed getters) (10 min)
Phase 4  →  Register in app.module + main.ts  (5 min)
Phase 5  →  .gitignore check                  (1 min)
Phase 6  →  Smoke test                        (5 min)
──────────────────────────────────────────────────────
Total                                         ~33 min
```

> **Next module after completion:** `health/` (Module 03)
