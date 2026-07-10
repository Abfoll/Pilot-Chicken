import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Round } from './round.entity';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class RoundService implements OnModuleInit {
  private readonly logger = new Logger(RoundService.name);
  private currentRound: Round | null = null;
  private _multiplier = 1.0;
  private _isActive = false;
  private _crashMultiplier = 0;

  constructor(
    @InjectRepository(Round)
    private roundRepo: Repository<Round>,
    private configService: ConfigService,
  ) {}

  async onModuleInit() {
    // Create first round on startup
    await this.createRound();
  }

  generateCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
    const combined = `${serverSeed}:${clientSeed}:${nonce}`;
    const hash = crypto.createHash('sha256').update(combined).digest('hex');
    const h = parseInt(hash.slice(0, 8), 16);
    const e = 2 ** 32;
    const result = (h / e); // between 0 and 1
    const houseEdge = this.configService.get('HOUSE_EDGE') || 0.02;
    // Classic crash point formula with house edge
    let crash = (1 / (1 - result)) * (1 - houseEdge);
    crash = Math.max(crash, 1.01);
    return Math.round(crash * 100) / 100;
  }

  
async getNextRoundNumber(): Promise<number> {
  const last = await this.roundRepo.find({ order: { roundNumber: 'DESC' }, take: 1 });
  return last.length ? last[0].roundNumber + 1 : 1;
}

async getNextNonce(): Promise<number> {
  const last = await this.roundRepo.find({ order: { nonce: 'DESC' }, take: 1 });
  return last.length ? last[0].nonce + 1 : 1;
}
  

  async createRound(): Promise<Round> {
    const serverSeed = this.configService.get('SERVER_SEED') + Date.now();
    const serverSeedHash = crypto.createHash('sha256').update(serverSeed).digest('hex');
    const clientSeed = crypto.randomBytes(16).toString('hex');
    const nonce = await this.getNextNonce();
    const crashMultiplier = this.generateCrashPoint(serverSeed, clientSeed, nonce);

    const round = this.roundRepo.create({
      roundNumber: await this.getNextRoundNumber(),
      crashMultiplier,
      serverSeed,
      serverSeedHash,
      clientSeed,
      nonce,
      status: 'pending',
    });
    await this.roundRepo.save(round);
    this.currentRound = round;
    this._multiplier = 1.0;
    this._isActive = false;
    this._crashMultiplier = crashMultiplier;
    this.logger.log(`Round #${round.roundNumber} created. Crash at ${crashMultiplier}x`);
    return round;
  }

  async startRound(round: Round): Promise<void> {
    this.currentRound = round;
    round.status = 'active';
    await this.roundRepo.save(round);
    this._isActive = true;
    this._multiplier = 1.0;
    this.logger.log(`Round #${round.roundNumber} started.`);
  }

  async endRound(): Promise<Round> {
    if (!this.currentRound) return null;
    const round = this.currentRound;
    round.status = 'completed';
    round.endedAt = new Date();
    await this.roundRepo.save(round);
    this._isActive = false;
    this.currentRound = null;
    this.logger.log(`Round #${round.roundNumber} ended at ${round.crashMultiplier}x`);
    return round;
  }

  getCurrentRound(): Round | null {
    return this.currentRound;
  }

  getMultiplier(): number {
    return this._multiplier;
  }

  updateMultiplier(newMultiplier: number): void {
    this._multiplier = newMultiplier;
  }

  isActive(): boolean {
    return this._isActive;
  }

  getCrashMultiplier(): number {
    return this._crashMultiplier;
  }

  async revealSeed(roundId: number): Promise<string | null> {
    const round = await this.roundRepo.findOne({ where: { id: roundId } });
    if (!round || round.status !== 'completed') return null;
    return round.serverSeed;
  }

  // For verification endpoint
  async getRound(id: number): Promise<Round | null> {
    return this.roundRepo.findOne({ where: { id } });
  }

  async getRecentRounds(limit = 50): Promise<Round[]> {
    return this.roundRepo.find({
      where: { status: 'completed' },
      order: { endedAt: 'DESC' },
      take: limit,
    });
  }
}