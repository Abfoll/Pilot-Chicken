import { Controller, Get, Query } from '@nestjs/common';
import { LeaderboardService } from './leaderboard.service';

@Controller('leaderboard')
export class LeaderboardController {
  constructor(private leaderboardService: LeaderboardService) {}

  @Get()
  async getLeaderboard(@Query('limit') limit?: string) {
    const lim = limit ? Math.min(Math.max(Number(limit) || 10, 1), 100) : 50;
    return this.leaderboardService.getLeaderboard(lim);
  }
}
