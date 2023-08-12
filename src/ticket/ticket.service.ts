import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, Not, Repository } from 'typeorm';
import { Ticket } from './entities/ticket.entity';

@Injectable()
export class TicketService {
  constructor(
    @InjectRepository(Ticket) private ticketRepository: Repository<Ticket>,
  ) {}

  async save(tickets: Ticket[]) {
    return await this.ticketRepository.save(tickets);
  }

  async findDidNotWithdrawn() {
    return await this.ticketRepository.find({
      where: {
        withdrawn: IsNull(),
        ticketNumber: Not(IsNull()),
      },
    });
  }

  async withdrawnTickets(address: string) {
    return await this.ticketRepository.find({
      where: {
        withdrawn: Not(IsNull()),
        who: address,
      },
    });
  }
  async toWithdrawTickets(address: string) {
    return await this.ticketRepository.find({
      where: {
        withdrawn: IsNull(),
        ticketNumber: Not(IsNull()),
        who: address,
      },
      order: {
        date: 'ASC',
      },
    });
  }
}
