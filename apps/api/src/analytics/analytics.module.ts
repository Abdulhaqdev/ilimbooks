import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { LandingsModule } from '../landings/landings.module';
import { RotationsModule } from '../rotations/rotations.module';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

@Module({
  imports: [LandingsModule, AccountsModule, RotationsModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
