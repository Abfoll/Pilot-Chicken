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
        const url = config.get('DATABASE_URL');
        const isProduction = config.get('NODE_ENV') === 'production';
        // For production, we generally want synchronize: false,
        // but for now we can set it to true to auto-create tables.
        // In production, you should run migrations instead.
        const synchronize = config.get('DB_SYNCHRONIZE') === 'true' || !isProduction;
        return {
          type: 'postgres',
          url,
          entities: [User, Wallet, Transaction, Round, Bet],
          synchronize: synchronize, // true if dev or env var set
          logging: !isProduction,
          ssl: isProduction ? { rejectUnauthorized: false } : false,
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}