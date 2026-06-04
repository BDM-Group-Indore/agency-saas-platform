export enum WhatsAppMessageDirection {
  INBOUND = 'INBOUND',
  OUTBOUND = 'OUTBOUND'
}

export enum WhatsAppMessageType {
  TEXT = 'TEXT',
  IMAGE = 'IMAGE',
  DOCUMENT = 'DOCUMENT',
  TEMPLATE = 'TEMPLATE'
}

export enum WhatsAppMessageStatus {
  SENT = 'SENT',
  DELIVERED = 'DELIVERED',
  READ = 'READ',
  FAILED = 'FAILED'
}

export enum WhatsAppConversationStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  SNOOZED = 'SNOOZED'
}

export enum WhatsAppBroadcastStatus {
  DRAFT = 'DRAFT',
  SENDING = 'SENDING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export interface IWhatsAppConversation {
  id: string;
  contactId?: string;
  phoneNumber: string;
  lastMessage?: string;
  lastMessageAt: Date;
  status: WhatsAppConversationStatus;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWhatsAppMessage {
  id: string;
  conversationId: string;
  direction: WhatsAppMessageDirection;
  senderId?: string;
  body: string;
  type: WhatsAppMessageType;
  status: WhatsAppMessageStatus;
  templateName?: string;
  mediaUrl?: string;
  createdAt: Date;
}

export interface IWhatsAppTemplate {
  id: string;
  name: string;
  category: string;
  language: string;
  components: any; // Header, Body, Footer configurations
  status: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IWhatsAppBroadcast {
  id: string;
  name: string;
  templateId: string;
  status: WhatsAppBroadcastStatus;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  failedCount: number;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
}
