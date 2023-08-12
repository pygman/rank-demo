import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AppService } from './app.service';

@Injectable()
export class ScheduleService {
  constructor(private readonly appService: AppService) {}

  @Cron('* 15 * * * *')
  async handleFlushRank() {
    console.log('==== start schedule ====');

    await this.appService.flushRank();

    console.log('==== end schedule ====');
  }

  @Cron('0 * * * * *')
  async handleCheckWithdrawn() {
    console.log('==== start check ====');

    await this.appService.checkWithdrawn();

    console.log('==== end check ====');
  }
}
