import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class Ticket {
  @PrimaryGeneratedColumn()
  id: number = null;

  @Column({ type: 'integer', nullable: true })
  rank: number;

  @Column({ type: 'text', nullable: true })
  stakes: bigint | string;

  @Column({ type: 'text' })
  who: string;

  @Column({ type: 'text', nullable: true })
  poseAmount: bigint | string;

  @Column({ type: 'text', nullable: true })
  ticketNumber: bigint | string;

  @Column({ type: 'text', nullable: true })
  signature: string;

  @Column({ type: 'text', nullable: true })
  withdrawn: string;

  @Column({ type: 'integer' })
  date: number;
}
