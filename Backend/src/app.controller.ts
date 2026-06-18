import { Controller, Get, Post } from '@nestjs/common'
import { AppService } from './app.service'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }

  //route test logging
  @Post('test-logging')
  testLogging() {
    return {
      message: 'hello this is test-logging route',
      status: 'ok',
      data: {
        name: 'test',
        version: '1.0.0',
      },
    }
  }
}
