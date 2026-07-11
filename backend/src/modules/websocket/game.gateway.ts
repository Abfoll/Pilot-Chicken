import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoundService } from '../round/round.service';
import { BetService } from '../bet/bet.service';
import { WalletService } from '../wallet/wallet.service';
import { Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  @WebSocketServer() server: Server;
  private logger = new Logger(GameGateway.name);
  private multiplierInterval: NodeJS.Timeout;
  private roundInProgress = false;
  private countdownSeconds = 5;

  constructor(
    private roundService: RoundService,
    private betService: BetService,
    private walletService: WalletService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    this.countdownSeconds = this.configService.get('COUNTDOWN_SECONDS') || 5;
  }

  async onModuleInit() {
    this.logger.log('GameGateway initialized, starting game loop...');
    await this.startGameLoop();
  }

  // -------------------------------------------------------------
  // Connection handling (with debug logging)
  // -------------------------------------------------------------
  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      this.logger.log(`Connection attempt with token: ${token ? 'present' : 'missing'}`);

      if (!token) {
        this.logger.warn('No token provided, disconnecting');
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload.sub);
      if (!user) {
        this.logger.warn(`User not found for ID: ${payload.sub}`);
        client.disconnect();
        return;
      }
      client.data.user = user;
      this.logger.log(`Client ${client.id} connected as ${user.username}`);

      // Send current round state
      const round = this.roundService.getCurrentRound();
      if (round) {
        client.emit('roundState', {
          id: round.id,
          roundNumber: round.roundNumber,
          status: round.status,
          multiplier: round.status === 'active' ? this.roundService.getMultiplier() : null,
          crashMultiplier: round.status === 'completed' ? round.crashMultiplier : null,
          serverSeedHash: round.serverSeedHash,
        });
        if (round.status === 'active') {
          client.emit('multiplierUpdate', { multiplier: this.roundService.getMultiplier() });
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown authentication error';
      this.logger.error(`Authentication error: ${errorMessage}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  // -------------------------------------------------------------
  // Place Bet
  // -------------------------------------------------------------
  @SubscribeMessage('placeBet')
  async handlePlaceBet(client: Socket, payload: { wager: number; autoCashOut?: number; walletType?: string }) {
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };
    const round = this.roundService.getCurrentRound();
    if (!round || round.status !== 'active') {
      return { success: false, message: 'Round not active' };
    }
    const pendingBets = await this.betService.findPendingByRound(round.id);
    const existing = pendingBets.find((b) => b.user.id === user.id);
    if (existing) {
      return { success: false, message: 'You already have a bet in this round' };
    }

    try {
      const walletType = payload.walletType || 'main';
      if (walletType === 'bonus') {
        await this.walletService.deductFromBonus(user, payload.wager, `Bet on round #${round.roundNumber}`);
      } else {
        await this.walletService.deduct(user, payload.wager, `Bet on round #${round.roundNumber}`);
      }
      const bet = await this.betService.createBet(user, round, payload.wager);
      client.data.betId = bet.id;
      client.data.autoCashOut = payload.autoCashOut || null;
      client.data.walletType = walletType;

      this.server.emit('playerJoined', {
        id: user.id,
        username: user.username,
        wager: payload.wager,
      });

      return { success: true, betId: bet.id };
    } catch (error) {
      return { success: false, message: error instanceof Error ? error.message : 'Unknown error' };
    }
  }

  // -------------------------------------------------------------
  // Cash Out (FIXED: numeric conversion)
  // -------------------------------------------------------------
  @SubscribeMessage('cashOut')
  async handleCashOut(client: Socket, payload: { betId: number }) {
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };
    const round = this.roundService.getCurrentRound();
    if (!round || round.status !== 'active') {
      return { success: false, message: 'Round not active' };
    }
    const bet = await this.betService.findById(payload.betId);
    if (!bet || bet.user.id !== user.id) {
      return { success: false, message: 'Bet not found' };
    }
    if (bet.status !== 'pending') {
      return { success: false, message: 'Bet already processed' };
    }

    const multiplier = this.roundService.getMultiplier();
    const wager = Number(bet.wager);           // force number
    const mult = Number(multiplier);           // force number
    const payout = wager * mult;
    const roundedPayout = Math.round(payout * 100) / 100; // 2 decimal places

    const walletType = client.data.walletType || 'main';
    if (walletType === 'bonus') {
      await this.walletService.addBonus(user, roundedPayout, `Cashed out at ${multiplier.toFixed(2)}x on round #${round.roundNumber}`);
    } else {
      await this.walletService.credit(user, roundedPayout, `Cashed out at ${multiplier.toFixed(2)}x on round #${round.roundNumber}`);
    }
    await this.betService.cashOut(bet.id, multiplier, payout);

    this.server.emit('playerCashedOut', {
      playerId: user.id,
      username: user.username,
      multiplier,
      payout: roundedPayout,
    });

    return { success: true, multiplier, payout: roundedPayout };
  }

  // -----------------------------------------------------------
  // Game Loop
  // -----------------------------------------------------------
  async startGameLoop() {
    if (this.roundInProgress) return;

    let round = this.roundService.getCurrentRound();
    if (!round || round.status === 'completed') {
      round = await this.roundService.createRound();
      this.logger.log(`Created round #${round.roundNumber} (pending)`);
    }

    await this.startCountdown(round);
  }

  private async startCountdown(round: any) {
    this.roundInProgress = true;
    this.logger.log(`Starting countdown for round #${round.roundNumber}`);

    for (let i = this.countdownSeconds; i > 0; i--) {
      this.server.emit('countdown', { seconds: i });
      await this.sleep(1000);
    }

    await this.roundService.startRound(round);
    this.logger.log(`Round #${round.roundNumber} is now ACTIVE, crash at ${round.crashMultiplier}x`);

    this.server.emit('roundState', {
      id: round.id,
      roundNumber: round.roundNumber,
      status: 'active',
      serverSeedHash: round.serverSeedHash,
    });

    this.startMultiplierTick(round);
  }

  private startMultiplierTick(round: any) {
    let multiplier = 1.0;
    const increment = 0.01;
    const crashPoint = round.crashMultiplier;

    this.multiplierInterval = setInterval(async () => {
      multiplier += increment;

      if (multiplier >= crashPoint) {
        clearInterval(this.multiplierInterval);

        await this.roundService.endRound();
        this.logger.log(`Round #${round.roundNumber} CRASHED at ${crashPoint}x`);

        const pending = await this.betService.findPendingByRound(round.id);
        for (const bet of pending) {
          await this.betService.markLost(bet.id);
        }

        this.server.emit('roundEnded', { multiplier: crashPoint });
        this.server.emit('roundState', {
          id: round.id,
          roundNumber: round.roundNumber,
          status: 'completed',
          crashMultiplier: crashPoint,
        });

        this.roundInProgress = false;
        setTimeout(() => {
          this.startGameLoop();
        }, 2000);
      } else {
        this.roundService.updateMultiplier(multiplier);
        this.server.emit('multiplierUpdate', { multiplier });
      }
    }, 100);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}