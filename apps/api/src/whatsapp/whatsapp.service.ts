import { Injectable, NotFoundException, BadRequestException, ConflictException, ForbiddenException, UnauthorizedException, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import { PrismaService } from '../database/prisma.service';
import { RedisService } from '../redis/redis.service';
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
export class WhatsappService implements OnModuleInit {
  private readonly logger = new Logger(WhatsappService.name);

  onModuleInit() {
    this.startQueueWorker();
  }

  constructor(
    private prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly redisService: RedisService,
  ) {}

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
  async sendMessage(
    dto: SendMessageDto,
    tenantId: string,
    senderUserId?: string,
    broadcastId?: string,
  ): Promise<WhatsAppMessage> {
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

    const providerMessageId = `wamid.${crypto.randomBytes(12).toString('hex')}`;

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
        providerMessageId,
        broadcastId: broadcastId || null,
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
        sentCount: 0,
        deliveredCount: 0,
        readCount: 0,
        failedCount: 0,
      },
    });

    // Queue the broadcast sending task asynchronously in Redis list
    const jobPayload = {
      broadcastId: broadcast.id,
      phoneNumbers: dto.phoneNumbers,
      templateId: dto.templateId,
      tenantId,
    };

    await this.redisService.getClient().lpush('whatsapp:broadcast:queue', JSON.stringify(jobPayload));
    this.logger.log(`Queued WhatsApp Broadcast Campaign: ${dto.name} (${broadcast.id}) for ${dto.phoneNumbers.length} targets`);

    return broadcast;
  }

  // 9. Reusable Dry Helper to process incoming messages and run Bot Engine auto-replies
  async processInboundMessage(phoneNumber: string, bodyText: string, tenantId: string): Promise<WhatsAppMessage> {
    // 1. Fetch or create conversation
    let conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { phoneNumber, tenantId },
    });

    if (!conversation) {
      // Check contact directory scoped to this tenant
      const contact = await this.prisma.contact.findFirst({
        where: { phone: phoneNumber, tenantId },
      });

      conversation = await this.prisma.whatsAppConversation.create({
        data: {
          phoneNumber,
          tenantId,
          contactId: contact?.id || null,
          status: WhatsAppConversationStatus.OPEN,
        },
      });
    }

    // 2. Log inbound message
    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: WhatsAppMessageDirection.INBOUND,
        body: bodyText,
        type: WhatsAppMessageType.TEXT,
        status: WhatsAppMessageStatus.READ,
      },
    });

    // 3. Bot Engine auto-reply decision
    const input = bodyText.toLowerCase().trim();
    let reply = '';
    let targetStatus: WhatsAppConversationStatus = WhatsAppConversationStatus.OPEN;

    if (input === 'help' || input === 'menu') {
      reply = `🤖 *WhatsApp Virtual Assistant* \n\nHello! Please reply with one of the following menu options:\n\n*1* - View Agency Services\n*2* - Request Support Callback\n*3* - Chat with Live Sales Agent`;
    } else if (input === '1') {
      reply = `💼 *Agency Services Overview* \n\nWe provide professional:\n• Performance Marketing & Ad Syncing\n• Custom CRM Solutions & Automations\n• AI Autopilot integrations\n\nVisit your dashboard profile to view pricing.`;
    } else if (input === '2') {
      reply = `🔧 *Support Case Initialized* \n\nWe have automatically opened a support case in our database linked to phone number ${phoneNumber}. A customer success coordinator will call you back shortly.`;
    } else if (input === '3') {
      reply = `👤 *Live Agent Transfer* \n\nTransferring conversation session to live agent queue... Our team has been notified. You can message directly now!`;
      targetStatus = WhatsAppConversationStatus.OPEN;
    } else {
      reply = `👋 *Hi there!* \n\nWelcome to our business channel. Please reply with *help* or *menu* to see available automated services.`;
    }

    // 4. Submit bot outbound message
    const botMessage = await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: WhatsAppMessageDirection.OUTBOUND,
        body: reply,
        type: WhatsAppMessageType.TEXT,
        status: WhatsAppMessageStatus.DELIVERED,
      },
    });

    // 5. Update conversation state
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

  // 10. Verification challenge for Meta Webhooks
  verifyWebhookChallenge(query: any): string {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    const localVerifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN') || 'mock_whatsapp_verify_token';

    if (mode === 'subscribe' && token === localVerifyToken) {
      return challenge;
    }
    throw new ForbiddenException('Verification token mismatch or invalid mode');
  }

  // 11. Secure Production Webhook
  async receiveWebhook(req: any): Promise<any> {
    const rawBody = req.rawBody;
    if (!rawBody) {
      throw new BadRequestException('Raw body not available. Make sure rawBody: true is enabled.');
    }

    // A. Verify Meta signature
    const signature = req.headers['x-hub-signature-256'] as string;
    if (!signature || !signature.startsWith('sha256=')) {
      throw new UnauthorizedException('Missing or invalid X-Hub-Signature-256 header');
    }

    const appSecret = this.configService.get<string>('WHATSAPP_APP_SECRET') || 'mock_whatsapp_app_secret';
    const signatureHash = signature.substring(7); // Remove 'sha256='
    const calculatedHash = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    const sigBuffer = Buffer.from(signatureHash, 'utf-8');
    const calcBuffer = Buffer.from(calculatedHash, 'utf-8');

    if (sigBuffer.length !== calcBuffer.length || !crypto.timingSafeEqual(sigBuffer, calcBuffer)) {
      throw new UnauthorizedException('Invalid signature');
    }

    // B. Parse Meta payload
    let body: any;
    try {
      body = JSON.parse(rawBody.toString('utf-8'));
    } catch (err) {
      throw new BadRequestException('Invalid JSON payload');
    }

    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const value = change?.value;
    const metadata = value?.metadata;

    // Acknowledge and process Meta status updates (reconciliation)
    if (value?.statuses && Array.isArray(value.statuses) && value.statuses.length > 0) {
      const statusObj = value.statuses[0];
      const providerMessageId = statusObj.id;
      const statusValue = statusObj.status; // 'sent', 'delivered', 'read', 'failed'

      if (providerMessageId && statusValue) {
        await this.processWebhookStatus(providerMessageId, statusValue);
        return { status: 'status_updated', messageId: providerMessageId };
      }
    }

    const message = value?.messages?.[0];

    if (!message || !metadata) {
      return { status: 'ignored' };
    }

    const messageId = message.id;
    const phoneNumber = message.from;
    const bodyText = message.text?.body;
    const wabaPhoneId = metadata.phone_number_id;

    if (!phoneNumber || !bodyText || !wabaPhoneId) {
      return { status: 'malformed_message' };
    }

    // C. Redis-based Idempotency check
    const redisKey = `whatsapp:webhook:processed:${messageId}`;
    const isProcessed = await this.redisService.get(redisKey);
    if (isProcessed) {
      return { status: 'duplicate' };
    }
    await this.redisService.set(redisKey, 'true', 86400); // 24 hours TTL

    // D. Map wabaPhoneNumberId -> Tenant
    const tenant = await this.prisma.tenant.findUnique({
      where: { wabaPhoneNumberId: wabaPhoneId },
    });

    if (!tenant) {
      throw new NotFoundException(`No tenant found matching WABA phone number ID: ${wabaPhoneId}`);
    }

    // E. Execute inbound bot processing
    return this.processInboundMessage(phoneNumber, bodyText, tenant.id);
  }

  // 12. Secure simulation route for authorized tenant users
  async simulateWebhook(dto: ReceiveWebhookDto, tenantId: string): Promise<WhatsAppMessage> {
    return this.processInboundMessage(dto.phoneNumber, dto.body, tenantId);
  }

  // ─── Background Queue Workers & Reconciliation Helpers ──────────────────────
  private async startQueueWorker() {
    this.logger.log('Starting WhatsApp Broadcast background queue worker loop...');
    while (true) {
      try {
        const client = this.redisService.getClient();
        if (client) {
          const rawJob = await client.rpop('whatsapp:broadcast:queue');
          if (rawJob) {
            const job = JSON.parse(rawJob);
            await this.processBroadcastJob(job);
          } else {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        } else {
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      } catch (err: any) {
        this.logger.error(`Error in WhatsApp queue worker loop: ${err.message}`, err.stack);
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }
  }

  private async processBroadcastJob(job: any) {
    const { broadcastId, phoneNumbers, templateId, tenantId } = job;
    this.logger.log(`Processing WhatsApp Broadcast Campaign ID: ${broadcastId} for ${phoneNumbers.length} targets`);

    const template = await this.prisma.whatsAppTemplate.findFirst({
      where: { id: templateId, tenantId },
    });

    if (!template) {
      this.logger.error(`Template ${templateId} not found during broadcast ${broadcastId}`);
      await this.prisma.whatsAppBroadcast.update({
        where: { id: broadcastId },
        data: { status: WhatsAppBroadcastStatus.FAILED },
      });
      return;
    }

    let sent = 0;
    let failed = 0;

    for (const phone of phoneNumbers) {
      try {
        if (phone.startsWith('999') || phone.length < 8) {
          failed++;
          await this.createFailedBroadcastMessage(phone, template.name, broadcastId, tenantId);
          continue;
        }

        const message = await this.fetchWithRetry(() =>
          this.sendMessage(
            {
              phoneNumber: phone,
              body: `[Template: ${template.name}] Hello, thank you for being our valued customer.`,
              type: WhatsAppMessageType.TEMPLATE,
              templateName: template.name,
            },
            tenantId,
            undefined,
            broadcastId,
          ),
        );

        sent++;
        this.scheduleMockWebhookStatusUpdates(message.providerMessageId!, phone, tenantId, broadcastId);

        await new Promise((resolve) => setTimeout(resolve, 50));
      } catch (err: any) {
        this.logger.error(`Failed to send broadcast message to ${phone}: ${err.message}`);
        failed++;
      }
    }

    await this.prisma.whatsAppBroadcast.update({
      where: { id: broadcastId },
      data: {
        status: WhatsAppBroadcastStatus.COMPLETED,
        sentCount: sent,
        failedCount: failed,
      },
    });

    this.logger.log(`Completed processing Broadcast Campaign ID: ${broadcastId}. Sent: ${sent}, Failed: ${failed}`);
  }

  private async createFailedBroadcastMessage(phoneNumber: string, templateName: string, broadcastId: string, tenantId: string) {
    let conversation = await this.prisma.whatsAppConversation.findFirst({
      where: { phoneNumber, tenantId },
    });
    if (!conversation) {
      conversation = await this.prisma.whatsAppConversation.create({
        data: {
          phoneNumber,
          tenantId,
          status: WhatsAppConversationStatus.OPEN,
        },
      });
    }
    await this.prisma.whatsAppMessage.create({
      data: {
        conversationId: conversation.id,
        direction: WhatsAppMessageDirection.OUTBOUND,
        body: `[Template: ${templateName}] Hello, thank you for being our valued customer.`,
        type: WhatsAppMessageType.TEMPLATE,
        status: WhatsAppMessageStatus.FAILED,
        templateName,
        broadcastId,
      },
    });
  }

  async processWebhookStatus(providerMessageId: string, statusValue: string) {
    const message = await this.prisma.whatsAppMessage.findUnique({
      where: { providerMessageId },
    });

    if (!message) {
      this.logger.warn(`Received status update for unknown provider message ID: ${providerMessageId}`);
      return;
    }

    const uppercaseStatus = statusValue === 'delivered' ? WhatsAppMessageStatus.DELIVERED :
                            statusValue === 'read' ? WhatsAppMessageStatus.READ :
                            statusValue === 'failed' ? WhatsAppMessageStatus.FAILED : 
                            WhatsAppMessageStatus.SENT;

    await this.prisma.whatsAppMessage.update({
      where: { id: message.id },
      data: { status: uppercaseStatus },
    });

    if (message.broadcastId) {
      const updateField = statusValue === 'delivered' ? 'deliveredCount' : 
                          statusValue === 'read' ? 'readCount' : 
                          statusValue === 'failed' ? 'failedCount' : null;
      if (updateField) {
        await this.prisma.whatsAppBroadcast.update({
          where: { id: message.broadcastId },
          data: { [updateField]: { increment: 1 } },
        });
      }
    }
  }

  private scheduleMockWebhookStatusUpdates(providerMessageId: string, phoneNumber: string, tenantId: string, broadcastId: string) {
    setTimeout(async () => {
      try {
        await this.processWebhookStatus(providerMessageId, 'delivered');
      } catch (err: any) {
        this.logger.error(`Error in mock delivered status webhook update: ${err.message}`);
      }
    }, 1500);

    if (Math.random() > 0.15) {
      setTimeout(async () => {
        try {
          await this.processWebhookStatus(providerMessageId, 'read');
        } catch (err: any) {
          this.logger.error(`Error in mock read status webhook update: ${err.message}`);
        }
      }, 3500);
    }
  }

  // Rate-limiting and retry handler wrapper (Exponential backoff)
  private async fetchWithRetry<T>(fn: () => Promise<T>, retries = 3, delay = 1000): Promise<T> {
    try {
      return await fn();
    } catch (err: any) {
      if (retries <= 0) throw err;
      this.logger.warn(`API call failed: ${err.message}. Retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return this.fetchWithRetry(fn, retries - 1, delay * 2);
    }
  }
}
