import { Injectable } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Rank } from './entities/rank.entity';

@Injectable()
export class RankService {
  constructor(
    @InjectRepository(Rank) private rankRepository: Repository<Rank>,
  ) {}

  async save(ranks: Rank[]) {
    await this.rankRepository.save(ranks);
  }

  findAll() {
    return this.rankRepository.find();
  }

  findByDate(date: number) {
    return this.rankRepository.find({
      where: {
        date,
      },
    });
  }

  countByDate(date: number) {
    return this.rankRepository.count({
      where: {
        date,
      },
    });
  }
}
