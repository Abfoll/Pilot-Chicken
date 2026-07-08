import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Transaction } from './transaction.entity';
import { User } from '../user/user.entity';
import { Wallet } from '../wallet/wallet.entity';

@Injectable()
export class TransactionService {
  constructor(
    @InjectRepository(Transaction)
    private txRepo: Repository<Transaction>,
  ) {}

  async create(
    user: User,
    wallet: Wallet,
    amount: number,
    type: 'credit' | 'debit',
    description: string,
  ): Promise<Transaction> {
    const tx = this.txRepo.create({ user, wallet, amount, type, description });
    return this.txRepo.save(tx);
  }
}