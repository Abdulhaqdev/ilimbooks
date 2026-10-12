import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AccountsModule } from './accounts/accounts.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { LandingsModule } from './landings/landings.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { MarketsModule } from './markets/markets.module';
import { MetaModule } from './meta/meta.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AccountsModule,
    AuthModule,
    EventsModule,
    OrdersModule,
    AnalyticsModule,
    SettingsModule,
    LandingsModule,
    MarketsModule,
    MetaModule,
  ],
})
export class AppModule {}
