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

  // 🔥 Ensure this is present
  @Post('demo-credit')
  @UseGuards(JwtAuthGuard)
  async demoCredit(@Request() req) {
    // Remove production restriction for testing
    const wallet = await this.walletService.credit(req.user, 1000, 'Demo credit');
    return { balance: wallet.balance, bonusBalance: wallet.bonusBalance };
  }
}