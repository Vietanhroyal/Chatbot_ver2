import { NestFactory } from '@nestjs/core'
import { NestExpressApplication } from '@nestjs/platform-express'
import { join } from 'path'
import { AppModule } from './app.module'
import { API_PREFIX } from './common/constants'
import { ValidationPipe } from '@nestjs/common'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { AppConfigService } from './config/config.service'

async function bootstrap() {
  //create nest app
  const app = await NestFactory.create<NestExpressApplication>(AppModule)

  // get instance from App. AppConfigService was created before create NestApp, so we can get it from App
  const configService = app.get(AppConfigService)

  // Serve static files from /public (chat tester UI)
  // Try multiple paths for both dev and prod
  const fs = require('fs')
  const possiblePaths = [
    join(__dirname, '..', 'public'),
    join(process.cwd(), 'public'),
    join(process.cwd(), 'Backend', 'public'),
  ]
  const publicPath = possiblePaths.find(p => fs.existsSync(p)) ?? possiblePaths[0]
  app.useStaticAssets(publicPath)

  // Apply a global prefix to every route, such as /api/v1.
  // This keeps backend API routes versioned and easy to identify.
  app.setGlobalPrefix(API_PREFIX)

  // Enable global request validation for DTOs.
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // Remove properties that are not defined in the DTO.
      forbidNonWhitelisted: true, // Throw a validation error when unknown properties are sent.
      transform: true, // Convert request payloads into DTO class instances.
    }),
  )

  // Register the global exception filter for consistent error responses.
  app.useGlobalFilters(new HttpExceptionFilter())

  // Register the global logging interceptor for HTTP request/response logs.
  app.useGlobalInterceptors(new LoggingInterceptor())

  // Start the HTTP server.
  await app.listen(configService.port ?? 3000)
  // Log the port used by the server.
  console.log(`Application is running on port ${configService.port ?? 3000}`)
  console.log(`Chat UI: http://localhost:${configService.port ?? 3000}/`)
}
bootstrap()
