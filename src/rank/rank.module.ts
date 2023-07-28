import { Module } from '@nestjs/common';
import { RankService } from './rank.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Rank } from './entities/rank.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Rank])],
  providers: [RankService],
})
export class RankModule {}
