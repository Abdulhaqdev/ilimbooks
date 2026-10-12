import { Module } from '@nestjs/common';
import { SettingsModule } from '../settings/settings.module';
import { LandingsController } from './landings.controller';
import { LandingsService } from './landings.service';

@Module({
  imports: [SettingsModule],
  controllers: [LandingsController],
  providers: [LandingsService],
  exports: [LandingsService],
})
export class LandingsModule {}
