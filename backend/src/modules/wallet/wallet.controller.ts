import { Controller, Get, Post, UseGuards, Request, BadRequestException } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getWallet(@Request() req) {
    const wallet = await this.walletService.getWallet(req.user);
    return { balance: wallet.balance, bonusBalance: wallet.bonusBalance };
  }

  // 🔥 NEW: Demo credit endpoint
  @Post('demo-credit')
  @UseGuards(JwtAuthGuard)
  async demoCredit(@Request() req) {
    // Optional: restrict to non-production
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Not available in production');
    }
    const user = req.user;
    const amount = 1000; // or read from query param
    const wallet = await this.walletService.credit(user, amount, 'Demo credit for testing');
    return { balance: wallet.balance, bonusBalance: wallet.bonusBalance, message: `Credited ${amount}` };
  }
}