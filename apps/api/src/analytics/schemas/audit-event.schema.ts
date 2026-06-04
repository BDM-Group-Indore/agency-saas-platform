import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

@Schema({ timestamps: true })
export class AuditEvent extends Document {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ index: true })
  userId?: string;

  @Prop({ required: true, index: true })
  event: string; // e.g. "USER_LOGIN", "LEAD_CREATED", "INVOICE_PAID", "API_REQUEST"

  @Prop({ required: true })
  status: string; // "SUCCESS", "FAILED"

  @Prop({ type: MongooseSchema.Types.Mixed })
  meta?: any;

  @Prop()
  ipAddress?: string;

  @Prop()
  duration?: number; // In milliseconds (for API request latencies)

  @Prop({ default: Date.now, index: true })
  timestamp: Date;
}

export const AuditEventSchema = SchemaFactory.createForClass(AuditEvent);
