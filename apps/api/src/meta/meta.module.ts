import { Module } from '@nestjs/common';
import { LandingsModule } from '../landings/landings.module';
import { SettingsModule } from '../settings/settings.module';
import { MetaCapiService } from './meta-capi.service';
import { MetaController } from './meta.controller';

@Module({
  imports: [SettingsModule, LandingsModule],
  controllers: [MetaController],
  providers: [MetaCapiService],
  exports: [MetaCapiService],
})
export class MetaModule {}
