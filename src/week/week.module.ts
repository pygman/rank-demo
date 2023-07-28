import { Module } from '@nestjs/common';
import { WeekService } from './week.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Week } from './entities/week.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Week])],
  providers: [WeekService],
})
export class WeekModule {}
