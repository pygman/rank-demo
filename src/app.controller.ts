import { Controller, Get, Query } from '@nestjs/common';
import { AppService } from './app.service';
import { Week } from './week/entities/week.entity';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get('/weekly-rank')
  async weeklyRank(): Promise<Week[]> {
    return await this.appService.getWeeklyRank();
  }

  @Get('/stake')
  async stake(@Query() { address }: { address: string }): Promise<string> {
    if (!address) return '0';
    try {
      return await this.appService.getStake(address);
    } catch (e) {
      return '0';
    }
  }

  @Get('/stake1')
  async stake1(@Query() { address }: { address: string }): Promise<string> {
    if (!address) return '0';
    try {
      return await this.appService.getStake1(address);
    } catch (e) {
      return '0';
    }
  }

  @Get('/stake2')
  async stake2(@Query() { address }: { address: string }): Promise<string> {
    if (!address) return '0';
    try {
      return await this.appService.getStake2(address);
    } catch (e) {
      return '0';
    }
  }
}
