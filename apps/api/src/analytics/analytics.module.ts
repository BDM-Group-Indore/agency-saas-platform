import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { EventStoreService } from './event-store.service';
import { AuditLogInterceptor } from './interceptors/audit-log.interceptor';
import { AuditEvent, AuditEventSchema } from './schemas/audit-event.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditEvent.name, schema: AuditEventSchema },
    ]),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    EventStoreService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLogInterceptor,
    },
  ],
  exports: [AnalyticsService, EventStoreService],
})
export class AnalyticsModule {}
