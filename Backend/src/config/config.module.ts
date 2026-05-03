import { Module } from '@nestjs/common'
import { AppConfigService } from './config.service'
import { ConfigModule } from '@nestjs/config'
import * as joi from 'joi'
@Module({
  imports: [
    ConfigModule.forRoot({
      //that helps to load .env file at runtime
      isGlobal: true,
      envFilePath: '.env',

      validationSchema: joi.object({
        // joi is a library for validate data at runtime
        NODE_ENV: joi
          .string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: joi.number().default(3000),
        OPENAI_API_KEY: joi.string().required(), // openAI must be required
      }),

      validationOptions: {
        abortEarly: true,
      },
    }),
  ],

  providers: [AppConfigService],
  exports: [AppConfigService],
})
export class AppConfigModule {}
