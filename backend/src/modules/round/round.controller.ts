import { Controller, Get, Param } from '@nestjs/common';
import { RoundService } from './round.service';

@Controller('round')
export class RoundController {
  constructor(private roundService: RoundService) {}

  @Get('current')
  getCurrentRound() {
    const round = this.roundService.getCurrentRound();
    if (!round) return { status: 'idle' };
    return {
      id: round.id,
      roundNumber: round.roundNumber,
      status: round.status,
      multiplier: round.status === 'active' ? this.roundService.getMultiplier() : null,
      crashMultiplier: round.status === 'completed' ? Number(round.crashMultiplier) : null,
      serverSeedHash: round.serverSeedHash,
    };
  }

  @Get('history')
  async getHistory() {
    const rounds = await this.roundService.getRecentRounds(50);
    const formatted = rounds.map((r) => ({
      id: r.id,
      roundNumber: r.roundNumber,
      multiplier: Number(r.crashMultiplier),
      endedAt: r.endedAt,
    }));
    return { rounds: formatted };
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
    const crashMultiplierNum = Number(round.crashMultiplier);
    const verified = Math.abs(computed - crashMultiplierNum) < 0.001;

    return {
      verified,
      serverSeed: round.serverSeed,
      clientSeed: round.clientSeed,
      nonce: round.nonce,
      crashMultiplier: crashMultiplierNum,
      computed,
    };
  }
}