import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet } from '../bet/bet.entity';

export interface LeaderboardEntry {
  userId: number;
  username: string;
  totalWon: number;
  bets: number;
}

@Injectable()
export class LeaderboardService {
  constructor(
    @InjectRepository(Bet)
    private betRepo: Repository<Bet>,
  ) {}

  async getLeaderboard(limit = 50): Promise<LeaderboardEntry[]> {
    try {
      const raw = await this.betRepo
        .createQueryBuilder('bet')
        .innerJoin('bet.user', 'user')
        .select('user.id', 'userId')
        .addSelect('user.username', 'username')
        .addSelect(
          "COALESCE(SUM(CASE WHEN bet.status = 'cashed_out' THEN bet.payout ELSE 0 END), 0)",
          'totalWon',
        )
        .addSelect('COUNT(bet.id)', 'bets')
        .groupBy('user.id')
        .addGroupBy('user.username')
        .orderBy('"totalWon"', 'DESC')
        .limit(limit)
        .getRawMany();

      return raw.map((entry) => ({
        userId: Number(entry.userId),
        username: entry.username || `Player_${entry.userId}`,
        totalWon: Math.round(Number(entry.totalWon) * 100) / 100,
        bets: Number(entry.bets),
      }));
    } catch {
      return [];
    }
  }
}
