export interface AuditEventPayload {
  id?: string;
  tenantId: string;
  userId?: string;
  event: string;         // e.g. "USER_LOGIN", "LEAD_CREATED", "INVOICE_PAID"
  status: string;        // "SUCCESS", "FAILED"
  meta?: Record<string, any>;
  ipAddress?: string;
  duration?: number;     // response time in ms (for API request logging)
  timestamp: Date;
}

export interface ApiMetricsSummary {
  totalRequests: number;
  averageLatency: number; // in ms
  statusDistribution: Record<string, number>;
  trend: {
    timestamp: Date;
    requestCount: number;
    avgLatency: number;
  }[];
}
