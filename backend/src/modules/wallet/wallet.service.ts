import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wallet } from './wallet.entity';
import { User } from '../user/user.entity';
import { TransactionService } from '../transaction/transaction.service';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(Wallet)
    private walletRepo: Repository<Wallet>,
    private transactionService: TransactionService,
  ) {}

  async getWallet(user: User, type = 'main'): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({ where: { user, type } });
    if (!wallet) {
      wallet = this.walletRepo.create({ user, balance: 0, bonusBalance: 0, type });
      await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async deduct(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user);
    if (wallet.balance < amount) throw new BadRequestException('Insufficient balance');
    wallet.balance -= amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, -amount, 'debit', description);
    return wallet;
  }

  async credit(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user);
    wallet.balance += amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, amount, 'credit', description);
    return wallet;
  }

  async addBonus(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user);
    wallet.bonusBalance += amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, amount, 'credit', description);
    return wallet;
  }
}