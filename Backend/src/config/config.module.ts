import { Module } from '@nestjs/common';
import { AppConfigService } from './config.service';
import { ConfigModule } from '@nestjs/config'
import * as joi from "joi"
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, 
      envFilePath: ".env",
    
      validationSchema: joi.object({ //what joi mean? role of that and how it work
        NODE_ENV:'sdf' ,
        PORT: 'asdf', 
        OPENAI_API_KEY: 'asdf' 


      }),
      validationOptions: {
        abortEarly: true,
      }

    })
  ],



  providers: [AppConfigService],
  exports: [AppConfigService]
})
export class AppConfigModule { }
