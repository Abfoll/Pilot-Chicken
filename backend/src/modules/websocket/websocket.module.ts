import { Module } from '@nestjs/common';
import { GameGateway } from './game.gateway';
import { RoundModule } from '../round/round.module';
import { BetModule } from '../bet/bet.module';
import { WalletModule } from '../wallet/wallet.module';
import { AuthModule } from '../auth/auth.module';
import { UserModule } from '../user/user.module';

@Module({
  imports: [RoundModule, BetModule, WalletModule, AuthModule, UserModule],
  providers: [GameGateway],
})
export class WebsocketModule {}