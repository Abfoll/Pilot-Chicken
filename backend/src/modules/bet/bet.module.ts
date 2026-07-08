import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bet } from './bet.entity';
import { BetService } from './bet.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bet])],
  providers: [BetService],
  exports: [BetService],
})
export class BetModule {}