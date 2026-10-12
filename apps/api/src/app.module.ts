import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { EventsModule } from './events/events.module';
import { LandingsModule } from './landings/landings.module';
import { OrdersModule } from './orders/orders.module';
import { PrismaModule } from './prisma/prisma.module';
import { MetaModule } from './meta/meta.module';
import { SettingsModule } from './settings/settings.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    EventsModule,
    OrdersModule,
    AnalyticsModule,
    SettingsModule,
    LandingsModule,
    MetaModule,
  ],
})
export class AppModule {}
