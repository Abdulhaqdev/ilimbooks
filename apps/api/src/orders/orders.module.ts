import { Module } from '@nestjs/common';
import { LandingsModule } from '../landings/landings.module';
import { SettingsModule } from '../settings/settings.module';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

@Module({
  imports: [SettingsModule, LandingsModule],
  controllers: [OrdersController],
  providers: [OrdersService],
})
export class OrdersModule {}
