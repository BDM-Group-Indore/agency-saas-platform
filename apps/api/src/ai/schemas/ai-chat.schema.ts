import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

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

@Schema()
export class AiMessage extends Document {
  @Prop({ required: true, index: true })
  conversationId: string;

  @Prop({ required: true, enum: ['user', 'assistant', 'system'] })
  role: 'user' | 'assistant' | 'system';

  @Prop({ required: true })
  content: string;

  @Prop({ default: Date.now })
  createdAt: Date;
}

export const AiMessageSchema = SchemaFactory.createForClass(AiMessage);
