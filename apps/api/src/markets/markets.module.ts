import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { MarketsController } from './markets.controller';
import { MarketsService } from './markets.service';

@Module({
  imports: [AccountsModule],
  controllers: [MarketsController],
  providers: [MarketsService],
  exports: [MarketsService],
})
export class MarketsModule {}
