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
        let url = config.get('DATABASE_URL');
        console.log('📦 Raw DATABASE_URL:', url); // will show in logs

        // If the host is incomplete (no domain), fix it
        if (url && !url.includes('.render.com')) {
          const parts = url.split('@');
          if (parts.length === 2) {
            const [userpass, hostAndDb] = parts;
            const [host, ...dbParts] = hostAndDb.split('/');
            if (host && !host.includes('.')) {
              // Assume Oregon region – adjust if your DB is elsewhere
              const fullHost = `${host}.oregon-postgres.render.com:5432`;
              const db = dbParts.join('/');
              url = `${userpass}@${fullHost}/${db}`;
              console.log('✅ Fixed DATABASE_URL (masked):', url.replace(/:[^:@]*@/, ':***@'));
            }
          }
        }

        // Ensure SSL is enabled for production (always for Render)
        const isProduction = config.get('NODE_ENV') === 'production';
        const finalUrl = url + (url.includes('?') ? '&' : '?') + 'sslmode=require';

        return {
          type: 'postgres',
          url: finalUrl,
          entities: [User, Wallet, Transaction, Round, Bet],
          synchronize: true, // auto‑create tables for now (disable later)
          logging: true,
          ssl: {
            rejectUnauthorized: false,
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}