import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { Week } from './week/entities/week.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/weekly-rank')
  async tt(): Promise<Week[]> {
    return await this.appService.getWeeklyRank();
  }
}
