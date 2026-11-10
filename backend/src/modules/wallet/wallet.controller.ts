import { Controller, Get, Post, UseGuards, Request, BadRequestException, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  constructor(private walletService: WalletService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getWallet(@Request() req) {
    return this.walletService.getBalances(req.user);
  }

  @Post('demo-credit')
  @UseGuards(JwtAuthGuard)
  async demoCredit(@Request() req, @Query('type') type: string) {
    // For production, remove this block if you want to allow demo credits
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Not available in production');
    }
    const walletType = type === 'bonus' ? 'bonus' : 'main';
    const amount = 1000;
    if (walletType === 'bonus') {
      await this.walletService.addBonus(req.user, amount, 'Demo bonus credit');
    } else {
      await this.walletService.credit(req.user, amount, 'Demo credit');
    }
    return this.walletService.getBalances(req.user);
  }

  // ---- NEW: set-balance endpoint ----
  @Post('set-balance')
  @UseGuards(JwtAuthGuard)
  async setBalance(@Request() req, @Query('amount') amount: string, @Query('type') type: string) {
    // Remove this block if you want to allow in production (for testing)
    if (process.env.NODE_ENV === 'production') {
      throw new BadRequestException('Not available in production');
    }
    const targetAmount = parseFloat(amount);
    if (isNaN(targetAmount) || targetAmount < 0) {
      throw new BadRequestException('Amount must be a positive number');
    }
    const walletType = type === 'bonus' ? 'bonus' : 'main';
    await this.walletService.setBalance(req.user, targetAmount, walletType);
    return this.walletService.getBalances(req.user);
  }
}