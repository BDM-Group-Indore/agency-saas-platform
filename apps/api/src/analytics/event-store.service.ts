import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { createClient, ClickHouseClient } from '@clickhouse/client';
import { AuditEvent } from './schemas/audit-event.schema';
import { AuditEventPayload } from '@saas/shared-types';

@Injectable()
export class EventStoreService implements OnModuleInit {
  private readonly logger = new Logger(EventStoreService.name);
  private clickhouseClient: ClickHouseClient | null = null;
  private clickhouseConnected = false;

  constructor(
    @InjectModel(AuditEvent.name)
    private readonly auditEventModel: Model<AuditEvent>,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    const chHost = this.configService.get<string>('CLICKHOUSE_HOST');
    const chPort = this.configService.get<string>('CLICKHOUSE_PORT') || '8123';
    const chUser = this.configService.get<string>('CLICKHOUSE_USER') || 'default';
    const chPass = this.configService.get<string>('CLICKHOUSE_PASSWORD') || '';
    const chDb = this.configService.get<string>('CLICKHOUSE_DATABASE') || 'default';

    if (!chHost) {
      this.logger.warn('CLICKHOUSE_HOST not configured in environment variables. Falling back to MongoDB.');
      return;
    }

    try {
      this.clickhouseClient = createClient({
        url: `http://${chHost}:${chPort}`,
        username: chUser,
        password: chPass,
        database: chDb,
      });

      const isAlive = await this.clickhouseClient.ping();
      if (isAlive) {
        this.clickhouseConnected = true;
        this.logger.log('Successfully connected to ClickHouse Analytics Database.');
        await this.initializeClickHouseSchema();
      } else {
        this.logger.warn('ClickHouse ping returned unhealthy. Falling back to MongoDB.');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize ClickHouse connection: ${error.message}. Falling back to MongoDB.`);
      this.clickhouseConnected = false;
    }
  }

  private async initializeClickHouseSchema() {
    if (!this.clickhouseClient) return;

    try {
      await this.clickhouseClient.command({
        query: `
          CREATE TABLE IF NOT EXISTS audit_events (
            id String,
            tenantId String,
            userId String,
            event String,
            status String,
            meta String,
            ipAddress String,
            duration Nullable(Int32),
            timestamp DateTime
          ) ENGINE = MergeTree()
          ORDER BY (tenantId, timestamp, event)
        `,
      });
      this.logger.log('ClickHouse audit_events schema verified successfully.');
    } catch (err) {
      this.logger.error(`Failed to create ClickHouse tables: ${err.message}`);
    }
  }

  // Record an Event
  async logEvent(payload: AuditEventPayload): Promise<void> {
    const eventId = payload.id || `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const eventTime = payload.timestamp || new Date();

    if (this.clickhouseConnected && this.clickhouseClient) {
      try {
        await this.clickhouseClient.insert({
          table: 'audit_events',
          values: [
            {
              id: eventId,
              tenantId: payload.tenantId,
              userId: payload.userId || '',
              event: payload.event,
              status: payload.status,
              meta: JSON.stringify(payload.meta || {}),
              ipAddress: payload.ipAddress || '',
              duration: payload.duration || null,
              timestamp: eventTime.toISOString().slice(0, 19).replace('T', ' '), // ClickHouse friendly DateTime format
            },
          ],
          format: 'JSONEachRow',
        });
        return;
      } catch (err) {
        this.logger.error(`Failed to insert event into ClickHouse: ${err.message}. Saving to fallback MongoDB.`);
      }
    }

    // MongoDB Fallback
    try {
      await this.auditEventModel.create({
        tenantId: payload.tenantId,
        userId: payload.userId,
        event: payload.event,
        status: payload.status,
        meta: payload.meta,
        ipAddress: payload.ipAddress,
        duration: payload.duration,
        timestamp: eventTime,
      });
    } catch (err) {
      this.logger.error(`Ingestion failure on fallback MongoDB event logger: ${err.message}`);
    }
  }

  // Retrieve Audit Logs
  async getAuditLogs(tenantId: string, limit = 100): Promise<AuditEventPayload[]> {
    if (this.clickhouseConnected && this.clickhouseClient) {
      try {
        const resultSet = await this.clickhouseClient.query({
          query: `
            SELECT id, tenantId, userId, event, status, meta, ipAddress, duration, timestamp 
            FROM audit_events 
            WHERE tenantId = {tenantId: String} 
            ORDER BY timestamp DESC 
            LIMIT {limit: UInt32}
          `,
          query_params: { tenantId, limit },
          format: 'JSONEachRow',
        });
        const rows = await resultSet.json<any>();
        return rows.map((r: any) => ({
          id: r.id,
          tenantId: r.tenantId,
          userId: r.userId || undefined,
          event: r.event,
          status: r.status,
          meta: JSON.parse(r.meta || '{}'),
          ipAddress: r.ipAddress || undefined,
          duration: r.duration || undefined,
          timestamp: new Date(r.timestamp),
        }));
      } catch (err) {
        this.logger.error(`Failed to fetch audit logs from ClickHouse: ${err.message}. Querying fallback MongoDB.`);
      }
    }

    // MongoDB Fallback
    const docs = await this.auditEventModel
      .find({ tenantId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();

    return docs.map((doc) => ({
      id: doc.id || (doc as any)._id?.toString(),
      tenantId: doc.tenantId,
      userId: doc.userId,
      event: doc.event,
      status: doc.status,
      meta: doc.meta,
      ipAddress: doc.ipAddress,
      duration: doc.duration,
      timestamp: doc.timestamp,
    }));
  }

  // Retrieve Latency Metrics
  async getApiPerformanceMetrics(tenantId: string): Promise<any> {
    if (this.clickhouseConnected && this.clickhouseClient) {
      try {
        const statsQuery = await this.clickhouseClient.query({
          query: `
            SELECT 
              count() as totalRequests,
              avg(duration) as averageLatency
            FROM audit_events
            WHERE tenantId = {tenantId: String} AND event = 'API_REQUEST' AND duration IS NOT NULL
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });
        const stats = await statsQuery.json<any>();

        const codesQuery = await this.clickhouseClient.query({
          query: `
            SELECT 
              status as code,
              count() as count
            FROM audit_events
            WHERE tenantId = {tenantId: String} AND event = 'API_REQUEST'
            GROUP BY status
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });
        const codes = await codesQuery.json<any>();

        const trendQuery = await this.clickhouseClient.query({
          query: `
            SELECT 
              toStartOfHour(timestamp) as timeSlot,
              count() as requestCount,
              avg(duration) as avgDuration
            FROM audit_events
            WHERE tenantId = {tenantId: String} AND event = 'API_REQUEST' AND duration IS NOT NULL
            GROUP BY timeSlot
            ORDER BY timeSlot DESC
            LIMIT 24
          `,
          query_params: { tenantId },
          format: 'JSONEachRow',
        });
        const trend = await trendQuery.json<any>();

        const statusDistribution: Record<string, number> = {};
        codes.forEach((c: any) => {
          statusDistribution[c.code] = parseInt(c.count);
        });

        return {
          totalRequests: parseInt(stats[0]?.totalRequests || 0),
          averageLatency: Math.round(parseFloat(stats[0]?.averageLatency || 0) * 10) / 10,
          statusDistribution,
          trend: trend.map((t: any) => ({
            timestamp: new Date(t.timeSlot),
            requestCount: parseInt(t.requestCount),
            avgLatency: Math.round(parseFloat(t.avgDuration) * 10) / 10,
          })),
        };
      } catch (err) {
        this.logger.error(`Failed to compile metrics from ClickHouse: ${err.message}. Querying fallback MongoDB.`);
      }
    }

    // MongoDB Fallback
    const totalRequests = await this.auditEventModel.countDocuments({ tenantId, event: 'API_REQUEST' });
    const agg = await this.auditEventModel.aggregate([
      { $match: { tenantId, event: 'API_REQUEST', duration: { $ne: null } } },
      { $group: { _id: null, avgLatency: { $avg: '$duration' } } },
    ]).exec();
    
    const averageLatency = agg.length > 0 ? Math.round(agg[0].avgLatency * 10) / 10 : 0;

    const codes = await this.auditEventModel.aggregate([
      { $match: { tenantId, event: 'API_REQUEST' } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]).exec();

    const statusDistribution: Record<string, number> = {};
    codes.forEach((c) => {
      statusDistribution[c._id] = c.count;
    });

    // 24 Hours mock trend logs from active entries
    const trendDocs = await this.auditEventModel.aggregate([
      { $match: { tenantId, event: 'API_REQUEST', duration: { $ne: null } } },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%dT%H:00:00.000Z', date: '$timestamp' },
          },
          requestCount: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
      { $sort: { _id: -1 } },
      { $limit: 24 },
    ]).exec();

    return {
      totalRequests,
      averageLatency,
      statusDistribution,
      trend: trendDocs.map((t) => ({
        timestamp: new Date(t._id),
        requestCount: t.requestCount,
        avgLatency: Math.round(t.avgDuration * 10) / 10,
      })),
    };
  }
}
