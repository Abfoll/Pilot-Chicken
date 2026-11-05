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
        const url = buildDatabaseUrl(config) ?? config.get<string>('DATABASE_URL');
        if (!url) {
          throw new Error('DATABASE_URL or DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME is required to start the backend');
        }

        return {
          type: 'postgres',
          url,
          entities: [User, Wallet, Transaction, Round, Bet],
          synchronize: true,
          logging: true,
          ssl: config.get('NODE_ENV') === 'production'
            ? { rejectUnauthorized: false }
            : undefined,
          extra: {
            connectionTimeoutMillis: 10000,
            keepAlive: true,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}

function buildDatabaseUrl(config: ConfigService): string | undefined {
  const host = config.get<string>('DB_HOST');
  const port = config.get<string>('DB_PORT');
  const user = config.get<string>('DB_USER');
  const password = config.get<string>('DB_PASSWORD');
  const database = config.get<string>('DB_NAME');

  if (!host || !port || !user || !password || !database) {
    return undefined;
  }

  return `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
}