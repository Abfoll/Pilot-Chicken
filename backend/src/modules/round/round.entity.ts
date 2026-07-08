import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, OneToMany } from 'typeorm';
import { Bet } from '../bet/bet.entity';

@Entity()
export class Round {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  roundNumber: number;

  @Column({ type: 'decimal', precision: 10, scale: 4 })
  crashMultiplier: number; // the multiplier at which the chicken crashes

  @Column({ nullable: true })
  serverSeed: string; // revealed after round ends

  @Column()
  serverSeedHash: string; // published before round

  @Column()
  clientSeed: string;

  @Column()
  nonce: number;

  @Column({ default: 'pending' })
  status: 'pending' | 'active' | 'completed';

  @CreateDateColumn()
  startedAt: Date;

  @Column({ nullable: true })
  endedAt: Date;

  @OneToMany(() => Bet, (bet) => bet.round)
  bets: Bet[];
}