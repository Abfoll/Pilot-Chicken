import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Round } from './round.entity';
import { RoundService } from './round.service';
import { RoundController } from './round.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Round])],
  providers: [RoundService],
  controllers: [RoundController],
  exports: [RoundService],
})
export class RoundModule {}