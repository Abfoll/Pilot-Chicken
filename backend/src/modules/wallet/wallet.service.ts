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

  async getBalances(user: User): Promise<{ balance: number; bonusBalance: number }> {
    const mainWallet = await this.getWallet(user, 'main');
    const bonusWallet = await this.getWallet(user, 'bonus');
    return {
      balance: Math.round((Number(mainWallet.balance) || 0) * 100) / 100,
      bonusBalance:
        Math.round(
          (Number(bonusWallet.bonusBalance) || Number(mainWallet.bonusBalance) || 0) * 100,
        ) / 100,
    };
  }

  async deduct(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'main');
    const currentBalance = Number(wallet.balance) || 0;
    if (currentBalance < amount) throw new BadRequestException('Insufficient balance');
    wallet.balance = Math.round((currentBalance - amount) * 100) / 100;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, -amount, 'debit', description);
    return wallet;
  }

  async credit(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'main');
    const currentBalance = Number(wallet.balance) || 0;
    wallet.balance = Math.round((currentBalance + amount) * 100) / 100;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, amount, 'credit', description);
    return wallet;
  }

  async addBonus(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'bonus');
    const currentBonus = Number(wallet.bonusBalance) || 0;
    wallet.bonusBalance = Math.round((currentBonus + amount) * 100) / 100;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, amount, 'credit', description);
    return wallet;
  }

  async deductFromBonus(user: User, amount: number, description: string): Promise<Wallet> {
    if (amount <= 0) throw new BadRequestException('Amount must be positive');
    const wallet = await this.getWallet(user, 'bonus');
    const currentBonus = Number(wallet.bonusBalance) || 0;
    if (currentBonus < amount) throw new BadRequestException('Insufficient bonus balance');
    wallet.bonusBalance = Math.round((currentBonus - amount) * 100) / 100;
    await this.walletRepo.save(wallet);
    await this.transactionService.create(user, wallet, -amount, 'debit', description);
    return wallet;
  }

  // ✅ setBalance – uses the same fixed getWallet
  async setBalance(user: User, amount: number, type: string = 'main'): Promise<Wallet> {
    if (amount < 0) throw new BadRequestException('Amount must be non-negative');
    const wallet = await this.getWallet(user, type);
    const rounded = Math.round(amount * 100) / 100;
    if (type === 'bonus') {
      wallet.bonusBalance = rounded;
    } else {
      wallet.balance = rounded;
    }
    await this.walletRepo.save(wallet);
    return wallet;
  }
}