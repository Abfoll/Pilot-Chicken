import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { User } from '../modules/user/user.entity';
import { Wallet } from '../modules/wallet/wallet.entity';
import { Transaction } from '../modules/transaction/transaction.entity';
import { Round } from '../modules/round/round.entity';
import { Bet } from '../modules/bet/bet.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => {
        const isProduction = config.get('NODE_ENV') === 'production';
        return {
          type: 'postgres',
          url: config.get('DATABASE_URL'), // 👈 single connection string
          entities: [User, Wallet, Transaction, Round, Bet],
          synchronize: !isProduction, // 🚫 disable in production
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false, // Render requires SSL
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}