import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, CreateDateColumn } from 'typeorm';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/wallet.entity';

@Entity()
export class Transaction {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User)
  user: User;

  @ManyToOne(() => Wallet)
  wallet: Wallet;

  @Column({ type: 'decimal', precision: 18, scale: 2 })
  amount: number;

  @Column()
  type: 'credit' | 'debit';

  @Column()
  description: string;

  @CreateDateColumn()
  createdAt: Date;
}