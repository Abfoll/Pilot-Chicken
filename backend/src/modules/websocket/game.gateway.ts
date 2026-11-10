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
  private remainingCountdown = 5;

  constructor(
    private roundService: RoundService,
    private betService: BetService,
    private walletService: WalletService,
    private configService: ConfigService,
    private jwtService: JwtService,
    private userService: UserService,
  ) {
    this.countdownSeconds = Number(this.configService.get('COUNTDOWN_SECONDS')) || 5;
    this.remainingCountdown = this.countdownSeconds;
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
        const clientStatus = round.status === 'pending' ? 'countdown' : round.status;
        client.emit('roundState', {
          id: round.id,
          roundNumber: round.roundNumber,
          status: clientStatus,
          countdown: this.remainingCountdown,
          multiplier: round.status === 'active' ? this.roundService.getMultiplier() : 1.0,
          crashMultiplier: round.status === 'completed' ? Number(round.crashMultiplier) : null,
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
  async handlePlaceBet(
    client: Socket,
    payload: { wager: number; autoCashOut?: number; walletType?: string },
  ) {
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };

    const wager = Number(payload.wager);
    if (isNaN(wager) || wager <= 0) {
      return { success: false, message: 'Invalid wager amount' };
    }

    const round = this.roundService.getCurrentRound();
    if (!round || round.status !== 'pending') {
      return {
        success: false,
        message:
          round?.status === 'active'
            ? 'Betting closed for this round. Place your bet during the countdown!'
            : 'No active betting round available',
      };
    }

    const pendingBets = await this.betService.findPendingByRound(round.id);
    const existing = pendingBets.find((b) => b.user.id === user.id);
    if (existing) {
      return { success: false, message: 'You already have a bet in this round' };
    }

    try {
      const walletType = payload.walletType === 'bonus' ? 'bonus' : 'main';
      if (walletType === 'bonus') {
        await this.walletService.deductFromBonus(
          user,
          wager,
          `Bet on round #${round.roundNumber}`,
        );
      } else {
        await this.walletService.deduct(
          user,
          wager,
          `Bet on round #${round.roundNumber}`,
        );
      }

      const autoCashOut =
        payload.autoCashOut && Number(payload.autoCashOut) > 1.01
          ? Number(payload.autoCashOut)
          : null;

      const bet = await this.betService.createBet(
        user,
        round,
        wager,
        autoCashOut,
        walletType,
      );
      client.data.betId = bet.id;

      this.server.emit('playerJoined', {
        id: user.id,
        username: user.username,
        wager,
      });

      return { success: true, betId: bet.id };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // -------------------------------------------------------------
  // Cash Out Helper (handles both manual & auto cash out)
  // -------------------------------------------------------------
  private async processCashOut(bet: any, multiplier: number, round: any) {
    if (!bet || bet.status !== 'pending') return null;

    const wager = Number(bet.wager);
    const mult = Number(multiplier);
    const payout = Math.round(wager * mult * 100) / 100;

    const walletType = bet.walletType || 'main';
    if (walletType === 'bonus') {
      await this.walletService.addBonus(
        bet.user,
        payout,
        `Cashed out at ${mult.toFixed(2)}x on round #${round.roundNumber}`,
      );
    } else {
      await this.walletService.credit(
        bet.user,
        payout,
        `Cashed out at ${mult.toFixed(2)}x on round #${round.roundNumber}`,
      );
    }

    await this.betService.cashOut(bet.id, mult, payout);

    this.server.emit('playerCashedOut', {
      playerId: bet.user.id,
      username: bet.user.username,
      multiplier: mult,
      payout,
    });

    return { success: true, multiplier: mult, payout };
  }

  // -------------------------------------------------------------
  // Cash Out
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
    const result = await this.processCashOut(bet, multiplier, round);
    return result || { success: false, message: 'Cashout failed' };
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

    this.server.emit('roundState', {
      id: round.id,
      roundNumber: round.roundNumber,
      status: 'countdown',
      countdown: this.countdownSeconds,
      serverSeedHash: round.serverSeedHash,
    });

    for (let i = this.countdownSeconds; i > 0; i--) {
      this.remainingCountdown = i;
      this.server.emit('countdown', { seconds: i });
      await this.sleep(1000);
    }

    await this.roundService.startRound(round);
    this.logger.log(
      `Round #${round.roundNumber} is now ACTIVE, crash at ${round.crashMultiplier}x`,
    );

    this.server.emit('roundState', {
      id: round.id,
      roundNumber: round.roundNumber,
      status: 'active',
      multiplier: 1.0,
      serverSeedHash: round.serverSeedHash,
    });

    this.startMultiplierTick(round);
  }

  private startMultiplierTick(round: any) {
    const crashPoint = Number(round.crashMultiplier);
    const startTime = Date.now();
    const growthRate = 0.06; // standard exponential crash curve: e^(0.06 * t)

    this.multiplierInterval = setInterval(async () => {
      const elapsedSeconds = (Date.now() - startTime) / 1000;
      const currentMultiplier =
        Math.round(Math.exp(growthRate * elapsedSeconds) * 100) / 100;

      if (currentMultiplier >= crashPoint) {
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
          status: 'ended',
          crashMultiplier: crashPoint,
        });

        this.roundInProgress = false;
        setTimeout(() => {
          this.startGameLoop();
        }, 2500);
      } else {
        this.roundService.updateMultiplier(currentMultiplier);
        this.server.emit('multiplierUpdate', { multiplier: currentMultiplier });

        // Auto cashout for bets targeting this or lower multiplier
        const pendingBets = await this.betService.findPendingByRound(round.id);
        for (const bet of pendingBets) {
          const autoCashOut = Number(bet.autoCashOut);
          if (autoCashOut && autoCashOut > 1.0 && currentMultiplier >= autoCashOut) {
            await this.processCashOut(bet, currentMultiplier, round);
          }
        }
      }
    }, 100);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}