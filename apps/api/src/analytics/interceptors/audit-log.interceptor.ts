import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { EventStoreService } from '../event-store.service';

@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditLogInterceptor.name);

  constructor(private readonly eventStoreService: EventStoreService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse();
          const statusCode = response.statusCode;
          this.logRequest(request, statusCode, startTime);
        },
        error: (err) => {
          const statusCode = err.status || err.statusCode || 500;
          this.logRequest(request, statusCode, startTime);
        },
      }),
    );
  }

  private logRequest(request: any, statusCode: number, startTime: number) {
    try {
      const user = request.user;
      if (!user || !user.tenantId) {
        return; // Only log for protected/authenticated routes
      }

      // Avoid recursive logging of analytics event submissions
      if (request.url?.includes('/analytics/events')) {
        return;
      }

      const duration = Date.now() - startTime;
      const ipAddress =
        request.ip ||
        request.headers['x-forwarded-for'] ||
        request.connection?.remoteAddress ||
        '';

      const resolvedIp = typeof ipAddress === 'string' ? ipAddress.split(',')[0].trim() : undefined;

      this.eventStoreService
        .logEvent({
          tenantId: user.tenantId,
          userId: user.id || user.userId,
          event: 'API_REQUEST',
          status: String(statusCode),
          meta: {
            method: request.method,
            path: request.url,
          },
          ipAddress: resolvedIp,
          duration,
          timestamp: new Date(),
        })
        .catch((err) => {
          this.logger.error(`Failed to log API request event asynchronously: ${err.message}`);
        });
    } catch (err) {
      this.logger.error(`Error processing API request event: ${err.message}`);
    }
  }
}
