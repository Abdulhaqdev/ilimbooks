import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { LandingsModule } from '../landings/landings.module';
import { MarketsModule } from '../markets/markets.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [AccountsModule, LandingsModule, MarketsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
