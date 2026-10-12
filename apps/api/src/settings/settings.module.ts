import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [AccountsModule],
  controllers: [SettingsController],
  providers: [SettingsService],
  exports: [SettingsService],
})
export class SettingsModule {}
