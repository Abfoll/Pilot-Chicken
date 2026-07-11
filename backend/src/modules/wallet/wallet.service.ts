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

  // ✅ Fixed: use the relation with { id: user.id }
  async getWallet(user: User, type = 'main'): Promise<Wallet> {
    let wallet = await this.walletRepo.findOne({
      where: {
        user: { id: user.id },
        type: type,
      },
      relations: ['user'], // optional, but helps if you need the user later
    });
    if (!wallet) {
      wallet = this.walletRepo.create({ user, balance: 0, bonusBalance: 0, type });
      await this.walletRepo.save(wallet);
    }
    return wallet;
  }

  async deduct(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'main');
    if (wallet.balance < amount) throw new BadRequestException('Insufficient balance');
    wallet.balance -= amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, -amount, 'debit', description);
    return wallet;
  }

  async credit(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'main');
    wallet.balance += amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, amount, 'credit', description);
    return wallet;
  }

  async addBonus(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'bonus');
    wallet.bonusBalance += amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, amount, 'credit', description);
    return wallet;
  }

  async deductFromBonus(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'bonus');
    if (wallet.bonusBalance < amount) throw new BadRequestException('Insufficient bonus balance');
    wallet.bonusBalance -= amount;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, -amount, 'debit', description);
    return wallet;
  }

  // ✅ setBalance – uses the same fixed getWallet
  async setBalance(user: User, amount: number, type: string = 'main'): Promise<Wallet> {
    if (amount < 0) throw new BadRequestException('Amount must be non-negative');
    const wallet = await this.getWallet(user, type);
    if (type === 'bonus') {
      wallet.bonusBalance = amount;
    } else {
      wallet.balance = amount;
    }
    await this.walletRepo.save(wallet);
    return wallet;
  }
}