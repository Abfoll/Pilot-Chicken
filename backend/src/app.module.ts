import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { TransactionModule } from './modules/transaction/transaction.module';
import { RoundModule } from './modules/round/round.module';
import { BetModule } from './modules/bet/bet.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    AuthModule,
    UserModule,
    WalletModule,
    TransactionModule,
    RoundModule,
    BetModule,
    WebsocketModule,
    LeaderboardModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}