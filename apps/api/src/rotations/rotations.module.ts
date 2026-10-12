import { Module } from '@nestjs/common';
import { AccountsModule } from '../accounts/accounts.module';
import { SettingsModule } from '../settings/settings.module';
import { RotationsController } from './rotations.controller';
import { RotationsService } from './rotations.service';

@Module({
  imports: [AccountsModule, SettingsModule],
  controllers: [RotationsController],
  providers: [RotationsService],
  exports: [RotationsService],
})
export class RotationsModule {}
