import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Round } from '../round/round.entity';

@Entity()
export class Bet {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Round, (round) => round.bets)
  round: Round;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  wager: number;

  @Column({ type: 'decimal', precision: 10, scale: 4, nullable: true })
  cashOutMultiplier: number;

  @Column({ type: 'decimal', precision: 18, scale: 2, nullable: true })
  payout: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'cashed_out' | 'lost';

  @CreateDateColumn()
  createdAt: Date;
}