# Module 02: `config/` — Configuration Management

## Overview
The `config/` module centralizes all environment variables and application configurations. It uses `@nestjs/config` with strict validation to ensure the application fails fast if required configurations are missing.

## Dependencies
- `@nestjs/config` (NestJS configuration module)
- `joi` (Object schema validation for environment variables)

## Priority: **High** (Sprint 1 — required before setting up any services)

---

## File 1: `src/config/config.module.ts`

### Purpose
Initializes the `@nestjs/config` module globally and sets up the validation schema.

### Requirements
- Import `ConfigModule` from `@nestjs/config`.
- Set `isGlobal: true` so other modules don't need to import it.
- Use `Joi` to define a strict validation schema for environment variables.
- Load from `.env` file automatically.

### Validation Schema (Joi)
```typescript
Joi.object({
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().default(3000),
  OPENAI_API_KEY: Joi.string().required(),
  // DB_URL: Joi.string().required(), // Future phase
})
```

### Implementation Steps
1. Install `joi` if not present.
2. Create `AppConfigModule` (name it clearly).
3. Import `ConfigModule.forRoot({ ... })`.
4. Define the `validationSchema`.

---

## File 2: `src/config/config.service.ts`

### Purpose
*Optional but recommended pattern.* Instead of using NestJS's `ConfigService` directly everywhere and relying on magic strings (e.g., `configService.get('OPENAI_API_KEY')`), create a custom strongly-typed wrapper service.

### Requirements
- Inject NestJS `ConfigService`.
- Provide strongly-typed getter methods for each config value.

### Code Pattern
```typescript
@Injectable()
export class AppConfigService {
  constructor(private configService: ConfigService) {}

  get isProduction(): boolean {
    return this.configService.get<string>('NODE_ENV') === 'production';
  }

  get port(): number {
    return this.configService.get<number>('PORT');
  }

  get openAiApiKey(): string {
    return this.configService.get<string>('OPENAI_API_KEY');
  }
}
```

### Registration
- Provide `AppConfigService` and export it from `AppConfigModule`.

---

## Acceptance Criteria
- [ ] Application fails to start if `OPENAI_API_KEY` is not provided in the environment.
- [ ] Default values are applied correctly (e.g., PORT defaults to 3000).
- [ ] No magic strings are used when retrieving config values in other services.
- [ ] Registered globally in `app.module.ts`.

## Testing Notes
- Run the app without a `.env` file to ensure the Joi validation throws an error.
- Create a `.env` file with `OPENAI_API_KEY=test` and verify the app starts.
