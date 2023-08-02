import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Week } from './entities/week.entity';

@Injectable()
export class WeekService {
  constructor(
    @InjectRepository(Week) private weekRepository: Repository<Week>,
  ) {}
  async save(weeks: Week[]) {
    await this.weekRepository.save(weeks);
  }

  findByDate(date: number, limit: number) {
    return this.weekRepository.find({
      where: {
        date,
        vip: 1,
      },
      order: {
        rank: 'ASC',
      },
      take: limit,
    });
  }

  findOneByDate(address: string, date: number) {
    return this.weekRepository.findOne({
      where: {
        address,
        date,
      },
    });
  }

  countByDate(date: number) {
    return this.weekRepository.count({
      where: {
        date,
      },
    });
  }
}
