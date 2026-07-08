import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { RoundService } from './round.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('round')
export class RoundController {
  constructor(private roundService: RoundService) {}

  @Get('current')
  @UseGuards(JwtAuthGuard)
  getCurrentRound() {
    const round = this.roundService.getCurrentRound();
    if (!round) return { status: 'idle' };
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      multiplier: round.status === 'active' ? this.roundService.getMultiplier() : null,
      crashMultiplier: round.status === 'completed' ? round.crashMultiplier : null,
      serverSeedHash: round.serverSeedHash,
    };
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  async getHistory() {
    const rounds = await this.roundService.getRecentRounds(50);
    return rounds.map(r => ({
      id: r.id,
      roundNumber: r.roundNumber,
      multiplier: r.crashMultiplier,
      endedAt: r.endedAt,
    }));
  }

  @Get('verify/:id')
  async verifyRound(@Param('id') id: string) {
    const round = await this.roundService.getRound(+id);
    if (!round || round.status !== 'completed') {
      return { verified: false, message: 'Round not found or not completed' };
    }
    // Recalculate crash point for verification
    const computed = this.roundService.generateCrashPoint(
      round.serverSeed,
      round.clientSeed,
      round.nonce,
    );
    return {
      verified: computed === round.crashMultiplier,
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      crashMultiplier: round.crashMultiplier,
      computed,
    };
  }
}