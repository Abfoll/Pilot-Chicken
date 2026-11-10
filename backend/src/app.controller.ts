import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { RoundService } from './modules/round/round.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly roundService: RoundService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
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
}
