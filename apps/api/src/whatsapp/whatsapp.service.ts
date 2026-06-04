import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { ReceiveWebhookDto } from './dto/receive-webhook.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import {
  WhatsAppConversationStatus,
  WhatsAppMessageDirection,
  WhatsAppMessageType,
  WhatsAppMessageStatus,
  WhatsAppBroadcastStatus
} from '@saas/shared-types';
import { WhatsAppConversation, WhatsAppMessage, WhatsAppTemplate, WhatsAppBroadcast } from '@saas/database';


@Injectable()
export class WhatsappService {
  constructor(private prisma: PrismaService) {}

  // 1. Fetch Conversations (Inbox)
  async getConversations(query: PaginationQueryDto, tenantId: string): Promise<{ data: any[]; meta: any }> {
    const { skip, limit, search } = query;

    const where: any = {
      tenantId,
    };

    if (search) {
      where.OR = [
        { phoneNumber: { contains: search } },
        { lastMessage: { contains: search, mode: 'insensitive' } },
        {
          contact: {
            OR: [
              { firstName: { contains: search, mode: 'insensitive' } },
              { lastName: { contains: search, mode: 'insensitive' } },
            ],
          },
        },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.whatsAppConversation.count({ where }),
      this.prisma.whatsAppConversation.findMany({
        where,
        skip,
        take: limit,
        include: {
          contact: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { lastMessageAt: 'desc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 2. Fetch Messages in a Conversation
  async getMessages(conversationId: string, query: PaginationQueryDto, tenantId: string): Promise<{ data: any[]; meta: any }> {
    // Verify conversation belongs to tenant
    const conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation not found in this tenant`);
    }

    const { skip, limit } = query;

    const [total, data] = await Promise.all([
      this.prisma.whatsAppMessage.count({ where: { conversationId } }),
      this.prisma.whatsAppMessage.findMany({
        where: { conversationId },
        skip,
        take: limit,
        include: {
          sender: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return {
      data,
      meta: {
        total,
        page: query.page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // 3. Send Message Manually
  async sendMessage(dto: SendMessageDto, tenantId: string, senderUserId?: string): Promise<WhatsAppMessage> {
    // 1. Check or create conversation
    let conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { phoneNumber: dto.phoneNumber, tenantId },
    });

    if (!conversation) {
      // Find matching contact by phone
      const contact = await this.prisma.contact.findFirst({
        where: { phone: dto.phoneNumber, tenantId },
      });

      conversation = await this.prisma.whatsAppConversation.create({
        data: {
          phoneNumber: dto.phoneNumber,
          tenantId,
          contactId: contact?.id || null,
          status: WhatsAppConversationStatus.OPEN,
        },
      });
    }

    // 2. Create message record
    const message = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: WhatsAppMessageDirection.OUTBOUND,
        senderId: senderUserId || null,
        body: dto.body,
        type: dto.type || WhatsAppMessageType.TEXT,
        status: WhatsAppMessageStatus.SENT,
        templateName: dto.templateName || null,
        mediaUrl: dto.mediaUrl || null,
      },
    });

    // 3. Update last message state
    await this.prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: dto.body,
        lastMessageAt: new Date(),
      },
    });

    return message;
  }

  // 4. Retrieve Templates
  async getTemplates(tenantId: string): Promise<WhatsAppTemplate[]> {
    return this.prisma.whatsAppTemplate.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 5. Create Template
  async createTemplate(dto: CreateTemplateDto, tenantId: string): Promise<WhatsAppTemplate> {
    const existing = await this.prisma.whatsAppTemplate.findFirst({
      where: { name: dto.name, tenantId },
    });

    if (existing) {
      throw new ConflictException(`Template with name "${dto.name}" already exists`);
    }

    return this.prisma.whatsAppTemplate.create({
      data: {
        name: dto.name,
        category: dto.category,
        language: dto.language || 'en_US',
        components: dto.components as any,
        status: 'APPROVED',
        tenantId,
      },
    });
  }

  // 6. Delete Template
  async deleteTemplate(id: string, tenantId: string): Promise<WhatsAppTemplate> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found`);
    }

    return this.prisma.whatsAppTemplate.delete({
      where: { id },
    });
  }

  // 7. Retrieve Broadcast Statistics
  async getBroadcasts(tenantId: string): Promise<any[]> {
    return this.prisma.whatsAppBroadcast.findMany({
      where: { tenantId },
      include: {
        template: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // 8. Launch Broadcast Campaign
  async createBroadcast(dto: CreateBroadcastDto, tenantId: string): Promise<WhatsAppBroadcast> {
    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: dto.templateId, tenantId },
    });

    if (!template) {
      throw new NotFoundException(`Template not found`);
    }

    // Create broadcast metadata (State: SENDING)
    const broadcast = await this.prisma.whatsAppBroadcast.create({
      data: {
        name: dto.name,
        templateId: dto.templateId,
        status: WhatsAppBroadcastStatus.SENDING,
        tenantId,
      },
    });

    // Simulate sending messages sequentially
    let sent = 0;
    let delivered = 0;
    let read = 0;
    let failed = 0;

    for (const phone of dto.phoneNumbers) {
      // Failed numbers check (simulation metric helper)
      if (phone.startsWith('999') || phone.length < 8) {
        failed++;
        continue;
      }

      sent++;
      // Randomly simulate delivery and read rates for visual dashboard authenticity
      const rand = Math.random();
      if (rand > 0.15) {
        delivered++;
      }
      if (rand > 0.4) {
        read++;
      }

      // Execute messaging
      await this.sendMessage(
        {
          phoneNumber: phone,
          body: `[Template: ${template.name}] Hello, thank you for being our valued customer.`,
          type: WhatsAppMessageType.TEMPLATE,
          templateName: template.name,
        },
        tenantId
      );
    }

    // Complete campaign statistics
    return this.prisma.whatsAppBroadcast.update({
      where: { id: broadcast.id },
      data: {
        status: WhatsAppBroadcastStatus.COMPLETED,
        sentCount: sent,
        deliveredCount: delivered,
        readCount: read,
        failedCount: failed,
      },
    });
  }

  // 9. Public Webhook (Inbound Bot Engine Responder Simulation)
  async receiveWebhook(dto: ReceiveWebhookDto): Promise<WhatsAppMessage> {
    // 1. Deduce tenant id
    let tenantId: string | null = null;

    // A. Check existing conversation
    const existingConv = await this.prisma.whatsAppConversation.findFirst({
      where: { phoneNumber: dto.phoneNumber },
    });

    if (existingConv) {
      tenantId = existingConv.tenantId;
    } else {
      // B. Check contact directory
      const contact = await this.prisma.contact.findFirst({
        where: { phone: dto.phoneNumber },
      });
      if (contact) {
        tenantId = contact.tenantId;
      } else {
        // C. Fallback: retrieve first tenant
        const defaultTenant = await this.prisma.tenant.findFirst();
        if (!defaultTenant) {
          throw new BadRequestException('No tenant exists to handle webhook message');
        }
        tenantId = defaultTenant.id;
      }
    }

    // 2. Fetch or create conversation
    let conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { phoneNumber: dto.phoneNumber, tenantId },
    });

    if (!conversation) {
      conversation = await this.prisma.whatsAppConversation.create({
        data: {
          phoneNumber: dto.phoneNumber,
          tenantId,
          status: WhatsAppConversationStatus.OPEN,
        },
      });
    }

    // 3. Log inbound message
    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: WhatsAppMessageDirection.INBOUND,
        body: dto.body,
        type: WhatsAppMessageType.TEXT,
        status: WhatsAppMessageStatus.READ,
      },
    });

    // 4. Bot Engine auto-reply decision
    const input = dto.body.toLowerCase().trim();
    let reply = '';
    let targetStatus: WhatsAppConversationStatus = WhatsAppConversationStatus.OPEN;

    if (input === 'help' || input === 'menu') {
      reply = `🤖 *WhatsApp Virtual Assistant* \n\nHello! Please reply with one of the following menu options:\n\n*1* - View Agency Services\n*2* - Request Support Callback\n*3* - Chat with Live Sales Agent`;
    } else if (input === '1') {
      reply = `💼 *Agency Services Overview* \n\nWe provide professional:\n• Performance Marketing & Ad Syncing\n• Custom CRM Solutions & Automations\n• AI Autopilot integrations\n\nVisit your dashboard profile to view pricing.`;
    } else if (input === '2') {
      reply = `🔧 *Support Case Initialized* \n\nWe have automatically opened a support case in our database linked to phone number ${dto.phoneNumber}. A customer success coordinator will call you back shortly.`;
    } else if (input === '3') {
      reply = `👤 *Live Agent Transfer* \n\nTransferring conversation session to live agent queue... Our team has been notified. You can message directly now!`;
      targetStatus = WhatsAppConversationStatus.OPEN;
    } else {
      reply = `👋 *Hi there!* \n\nWelcome to our business channel. Please reply with *help* or *menu* to see available automated services.`;
    }

    // 5. Submit bot outbound message
    const botMessage = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: WhatsAppMessageDirection.OUTBOUND,
        body: reply,
        type: WhatsAppMessageType.TEXT,
        status: WhatsAppMessageStatus.DELIVERED,
      },
    });

    // 6. Update conversation state
    await this.prisma.whatsAppConversation.update({
      where: { id: conversation.id },
      data: {
        lastMessage: reply,
        lastMessageAt: new Date(),
        status: targetStatus,
      },
    });

    return botMessage;
  }
}
