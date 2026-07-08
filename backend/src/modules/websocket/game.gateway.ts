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
import { Logger, UseGuards } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserService } from '../user/user.service';

@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(GameGateway.name);
  private countdownInterval: NodeJS.Timeout;
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

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }
      const payload = this.jwtService.verify(token);
      const user = await this.userService.findById(payload.sub);
      if (!user) {
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
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client ${client.id} disconnected`);
  }

  @SubscribeMessage('placeBet')
  async handlePlaceBet(client: Socket, payload: { wager: number, autoCashOut?: number }) {
    const user = client.data.user;
    if (!user) return { success: false, message: 'Unauthorized' };
    const round = this.roundService.getCurrentRound();
    if (!round || round.status !== 'active') {
      return { success: false, message: 'Round not active' };
    }
    // Check if user already has a bet in this round
    const pendingBets = await this.betService.findPendingByRound(round.id);
    const existing = pendingBets.find(b => b.user.id === user.id);
    if (existing) {
      return { success: false, message: 'You already have a bet in this round' };
    }

    try {
      // Deduct wager
      await this.walletService.deduct(user, payload.wager, `Bet on round #${round.roundNumber}`);
      // Create bet
      const bet = await this.betService.createBet(user, round, payload.wager);
      // Store autoCashOut in client data (we'll use socket data for auto-cash)
      client.data.betId = bet.id;
      client.data.autoCashOut = payload.autoCashOut || null;
      
      // Broadcast to others that a new player joined
      this.server.emit('playerJoined', {
        id: user.id,
        username: user.username,
        wager: payload.wager,
      });
      
      return { success: true, betId: bet.id };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

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
    const payout = bet.wager * multiplier;
    // Credit winnings
    await this.walletService.credit(user, payout, `Cashed out at ${multiplier}x on round #${round.roundNumber}`);
    // Update bet
    await this.betService.cashOut(bet.id, multiplier, payout);
    
    // Broadcast cashout
    this.server.emit('playerCashedOut', {
      playerId: user.id,
      username: user.username,
      multiplier,
      payout,
    });
    
    return { success: true, multiplier, payout };
  }

  // -----------------------------------------------------------
  // Game Loop Control
  // -----------------------------------------------------------
  async startGameLoop() {
    await this.startCountdown();
  }

  private async startCountdown() {
    this.roundInProgress = true;
    for (let i = this.countdownSeconds; i > 0; i--) {
      this.server.emit('countdown', { seconds: i });
      await this.sleep(1000);
    }
    // Create new round
    const round = await this.roundService.createRound();
    await this.roundService.startRound(round);
    this.server.emit('roundState', {
      id: round.id,
      roundNumber: round.roundNumber,
      status: 'active',
      serverSeedHash: round.serverSeedHash,
    });
    // Start multiplier tick
    this.startMultiplierTick(round);
  }

  private startMultiplierTick(round: any) {
    let multiplier = 1.0;
    const increment = 0.01; // per 100ms
    const crashPoint = round.crashMultiplier;
    this.multiplierInterval = setInterval(async () => {
      multiplier += increment;
      if (multiplier >= crashPoint) {
        // Round ends
        clearInterval(this.multiplierInterval);
        await this.roundService.endRound();
        // Settle pending bets (lost)
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
        // Start next countdown after a short pause
        setTimeout(() => {
          this.startCountdown();
        }, 2000);
      } else {
        this.roundService.updateMultiplier(multiplier);
        this.server.emit('multiplierUpdate', { multiplier });
        // Check auto-cashout for each client
        // We'll handle auto-cash in client-side logic, but also server-side for reliability
      }
    }, 100);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}