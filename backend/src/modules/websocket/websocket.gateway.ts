// src/modules/websocket/websocket.gateway.ts
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
import { Logger } from '@nestjs/common';

@WebSocketGateway({ namespace: '/game', cors: true })
export class GameGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private logger = new Logger(GameGateway.name);
  private multiplierInterval: NodeJS.Timeout;

  constructor(
    private roundService: RoundService,
    private betService: BetService,
    private walletService: WalletService,
  ) {}

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // Send current round state
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('placeBet')
  async handlePlaceBet(client: Socket, payload: { wager: number, autoCashOut?: number }) {
    // Validate wager, deduct from wallet, create bet
    // Respond with bet confirmation
  }

  @SubscribeMessage('cashOut')
  async handleCashOut(client: Socket, payload: { betId: number }) {
    // Process cash-out: check if round active, calculate payout, update wallet
    // Emit success
  }

  // Called by RoundService to broadcast multiplier update
  broadcastMultiplier(multiplier: number) {
    this.server.emit('multiplierUpdate', { multiplier });
  }

  broadcastRoundState(round: any) {
    this.server.emit('roundState', round);
  }

  // Start multiplier tick (called after round starts)
  startMultiplierTick(roundId: number) {
    let multiplier = 1.00;
    const increment = 0.01; // per 100ms
    const currentRound = this.roundService.getCurrentRound();
    if (!currentRound) return;

    const crashPoint = Number(currentRound.crashMultiplier);
    this.multiplierInterval = setInterval(() => {
      if (!this.roundService.isActive()) {
        clearInterval(this.multiplierInterval);
        return;
      }
      multiplier += increment;
      if (multiplier >= crashPoint) {
        // round ends
        this.roundService.endRound();
        this.broadcastRoundState({ status: 'completed', multiplier });
        clearInterval(this.multiplierInterval);
        // notify all that round ended, bets settled
        this.server.emit('roundEnded', { multiplier });
        // start countdown for next round
        this.startCountdown();
      } else {
        this.broadcastMultiplier(multiplier);
      }
    }, 100);
  }

  startCountdown() {
    // emit countdown events (5,4,3,2,1)
    // after countdown, create and start new round
  }
}