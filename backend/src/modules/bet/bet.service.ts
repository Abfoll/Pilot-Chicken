import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Bet } from './bet.entity';
import { User } from '../user/user.entity';
import { Round } from '../round/round.entity';

@Injectable()
export class BetService {
  constructor(
    @InjectRepository(Bet)
    private betRepo: Repository<Bet>,
  ) {}

  async createBet(
    user: User,
    round: Round,
    wager: number,
    autoCashOut: number | null = null,
    walletType: string = 'main',
  ): Promise<Bet> {
    const bet = this.betRepo.create({
      user,
      round,
      wager,
      autoCashOut: autoCashOut || undefined,
      walletType,
      status: 'pending',
    });
    return this.betRepo.save(bet);
  }

  async cashOut(betId: number, multiplier: number, payout: number): Promise<Bet> {
    const bet = await this.betRepo.findOne({ where: { id: betId } });
    if (!bet) throw new Error('Bet not found');
    bet.cashOutMultiplier = multiplier;
    bet.payout = payout;
    bet.status = 'cashed_out';
    return this.betRepo.save(bet);
  }

  async markLost(betId: number): Promise<Bet> {
    const bet = await this.betRepo.findOne({ where: { id: betId } });
    if (!bet) throw new Error('Bet not found');
    bet.status = 'lost';
    bet.payout = 0;
    return this.betRepo.save(bet);
  }

  async findById(id: number): Promise<Bet | null> {
    return this.betRepo.findOne({ where: { id }, relations: ['user', 'round'] });
  }

  async findPendingByRound(roundId: number): Promise<Bet[]> {
    return this.betRepo.find({
      where: { round: { id: roundId }, status: 'pending' },
      relations: ['user'],
    });
  }
}