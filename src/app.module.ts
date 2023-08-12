import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import * as process from 'process';
import * as dotenv from 'dotenv';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RankModule } from './rank/rank.module';
import { WeekModule } from './week/week.module';
import { RankService } from './rank/rank.service';
import { WeekService } from './week/week.service';
import { Rank } from './rank/entities/rank.entity';
import { Week } from './week/entities/week.entity';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduleService } from './schedule.service';
import { TicketModule } from './ticket/ticket.module';
import { Ticket } from './ticket/entities/ticket.entity';
import { TicketService } from './ticket/ticket.service';

dotenv.config();

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: process.env.DB_PATH,
      autoLoadEntities: true,
      synchronize: true,
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forFeature([Rank]),
    TypeOrmModule.forFeature([Week]),
    TypeOrmModule.forFeature([Ticket]),
    RankModule,
    WeekModule,
    TicketModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ScheduleService,
    RankService,
    WeekService,
    TicketService,
  ],
})
export class AppModule {}
