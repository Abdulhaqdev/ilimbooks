import { Module } from '@nestjs/common';
import { LandingsModule } from '../landings/landings.module';
import { EventsController } from './events.controller';
import { EventsService } from './events.service';

@Module({
  imports: [LandingsModule],
  controllers: [EventsController],
  providers: [EventsService],
})
export class EventsModule {}
