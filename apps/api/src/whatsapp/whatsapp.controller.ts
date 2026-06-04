import { Controller, Get, Post, Body, Param, Delete, Query, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiQuery } from '@nestjs/swagger';
import { WhatsappService } from './whatsapp.service';
import { SendMessageDto } from './dto/send-message.dto';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateBroadcastDto } from './dto/create-broadcast.dto';
import { ReceiveWebhookDto } from './dto/receive-webhook.dto';
import { PaginationQueryDto } from '../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { WhatsAppMessage, WhatsAppTemplate, WhatsAppBroadcast } from '@saas/database';


@ApiTags('whatsapp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) {}

  // 1. Get all conversations in inbox
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('conversations')
  @ApiOperation({ summary: 'Retrieve active WhatsApp conversation sessions' })
  @ApiResponse({ status: 200, description: 'List of conversations' })
  getConversations(
    @Query() query: PaginationQueryDto,
    @TenantId() tenantId: string
  ): Promise<{ data: any[]; meta: any }> {
    return this.whatsappService.getConversations(query, tenantId);
  }

  // 2. Get messages in a conversation
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Retrieve message history for a specific conversation' })
  @ApiResponse({ status: 200, description: 'Message logs' })
  getMessages(
    @Param('id') conversationId: string,
    @Query() query: PaginationQueryDto,
    @TenantId() tenantId: string
  ): Promise<{ data: any[]; meta: any }> {
    return this.whatsappService.getMessages(conversationId, query, tenantId);
  }

  // 3. Send message manually
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('conversations/messages')
  @ApiOperation({ summary: 'Send outgoing WhatsApp message manually' })
  @ApiResponse({ status: 201, description: 'Message sent' })
  sendMessage(
    @Body() dto: SendMessageDto,
    @TenantId() tenantId: string,
    @Request() req: any
  ): Promise<WhatsAppMessage> {
    return this.whatsappService.sendMessage(dto, tenantId, req.user.id);
  }

  // 4. Get message templates
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('templates')
  @ApiOperation({ summary: 'Retrieve message templates list' })
  getTemplates(@TenantId() tenantId: string): Promise<WhatsAppTemplate[]> {
    return this.whatsappService.getTemplates(tenantId);
  }

  // 5. Create message template
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('templates')
  @ApiOperation({ summary: 'Create a new message template' })
  createTemplate(
    @Body() dto: CreateTemplateDto,
    @TenantId() tenantId: string
  ): Promise<WhatsAppTemplate> {
    return this.whatsappService.createTemplate(dto, tenantId);
  }

  // 6. Delete message template
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Delete('templates/:id')
  @ApiOperation({ summary: 'Remove a message template' })
  deleteTemplate(
    @Param('id') id: string,
    @TenantId() tenantId: string
  ): Promise<WhatsAppTemplate> {
    return this.whatsappService.deleteTemplate(id, tenantId);
  }

  // 7. Get broadcast campaigns
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('broadcasts')
  @ApiOperation({ summary: 'Retrieve broadcast marketing campaign reports' })
  getBroadcasts(@TenantId() tenantId: string): Promise<any[]> {
    return this.whatsappService.getBroadcasts(tenantId);
  }

  // 8. Trigger broadcast campaign
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('broadcasts')
  @ApiOperation({ summary: 'Launch message broadcast to target list' })
  createBroadcast(
    @Body() dto: CreateBroadcastDto,
    @TenantId() tenantId: string
  ): Promise<WhatsAppBroadcast> {
    return this.whatsappService.createBroadcast(dto, tenantId);
  }

  // 9. Public Webhook - Meta GET Verification Handshake
  @Get('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public verification challenge endpoint for Meta WhatsApp webhook' })
  verifyWebhook(@Query() query: any): string {
    return this.whatsappService.verifyWebhookChallenge(query);
  }

  // 10. Public Webhook - Secure POST Webhook receiver
  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Public webhook endpoint receiving incoming customer messages' })
  receiveWebhook(@Request() req: any): Promise<any> {
    return this.whatsappService.receiveWebhook(req);
  }

  // 11. Secure Webhook Simulator (Authenticated/Scoped to Tenant)
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('simulate-webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Secure simulation endpoint for authenticated sandbox client messaging' })
  simulateWebhook(
    @Body() dto: ReceiveWebhookDto,
    @TenantId() tenantId: string
  ): Promise<WhatsAppMessage> {
    return this.whatsappService.simulateWebhook(dto, tenantId);
  }
}
