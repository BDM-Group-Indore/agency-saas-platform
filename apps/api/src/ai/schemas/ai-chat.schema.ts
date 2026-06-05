import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

// ─── AiConversation ───────────────────────────────────────────────────────────

@Schema({ timestamps: true })
export class AiConversation extends Document {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  title: string;
}

export const AiConversationSchema = SchemaFactory.createForClass(AiConversation);

// ─── AiMessage ────────────────────────────────────────────────────────────────

/**
 * Each message now carries its own tenantId and userId so:
 *  - tenant isolation can be enforced directly on the messages collection
 *    without a parent conversation lookup
 *  - audit queries (e.g. "all messages by user X") are efficient
 *  - orphaned messages are impossible to leak across tenants
 *
 * Retention: MongoDB TTL index on `expiresAt` automatically deletes old
 * messages after the retention window expires.  The service sets `expiresAt`
 * to `now + RETENTION_DAYS`.  If `expiresAt` is null the message is kept
 * indefinitely (reserved for important system messages).
 */
@Schema({ timestamps: true })
export class AiMessage extends Document {
  @Prop({ required: true })
  conversationId: string;

  // Direct tenant + user ownership — no parent lookup needed for isolation
  @Prop({ required: true })
  tenantId: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @Prop({ required: true })
  content: string;

  // Retention policy: MongoDB TTL index removes the document after this date.
  // Set by the service; null = retain indefinitely.
  @Prop({ type: Date, default: null })
  expiresAt: Date | null;
}

export const AiMessageSchema = SchemaFactory.createForClass(AiMessage);

// ─── Indexes ──────────────────────────────────────────────────────────────────

// Primary lookup: messages for a conversation scoped to a tenant
AiMessageSchema.index({ tenantId: 1, conversationId: 1 });

// Audit / per-user lookup
AiMessageSchema.index({ tenantId: 1, userId: 1 });

// TTL index: MongoDB automatically purges documents once expiresAt passes.
// The { expireAfterSeconds: 0 } means "expire at the exact datetime stored".
// Documents with expiresAt = null are NOT affected by this index (MongoDB
// skips null values in TTL indexes).
AiMessageSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, sparse: true });
