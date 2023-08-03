import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
@Entity()
export class Rank {
  @PrimaryGeneratedColumn()
  id: number = null;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'text' })
  inviter: string;

  @Column({ type: 'text', nullable: true })
  stake: bigint | string;

  @Column({ type: 'text', nullable: true })
  stake1?: bigint | string;

  @Column({ type: 'text', nullable: true })
  stake2?: bigint | string;

  @Column({ type: 'text', nullable: true })
  stake0?: bigint | string;

  @Column({ type: 'integer', nullable: true })
  vip?: number;

  @Column({ type: 'text', nullable: true })
  bonus1: bigint | string;

  @Column({ type: 'text', nullable: true })
  bonus2: bigint | string;

  @Column({ type: 'integer' })
  date: number;
}
