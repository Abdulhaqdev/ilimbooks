import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { MarketsModule } from '../markets/markets.module';
import { SettingsModule } from '../settings/settings.module';
import { LandingsController } from './landings.controller';
import { LandingsService } from './landings.service';

@Module({
  imports: [AccountsModule, SettingsModule, MarketsModule],
  controllers: [LandingsController],
  providers: [LandingsService],
  exports: [LandingsService],
})
export class LandingsModule {}
