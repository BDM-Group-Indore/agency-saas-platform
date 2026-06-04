import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TenantId } from '../common/decorators/tenant-id.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AiService, CreatePromptDto, UpdatePromptDto } from './ai.service';

import { IsString, IsOptional, IsNumber, IsBoolean } from 'class-validator';

export class ChatDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsString()
  conversationId?: string;
}

export class AgentConfigDto {
  @IsOptional()
  @IsString()
  systemPrompt?: string;

  @IsOptional()
  @IsNumber()
  temperature?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

@ApiTags('ai')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  // ─── AI Chat Dialogue ─────────────────────────────────────────────────────
  @Post('chat')
  @ApiOperation({ summary: 'Send a prompt message to the AI assistant' })
  chat(
    @Body() dto: ChatDto,
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.chat(userId, tenantId, dto.message, dto.conversationId);
  }

  @Get('chat/conversations')
  @ApiOperation({ summary: 'List all active conversations for the caller' })
  getConversations(
    @TenantId() tenantId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.aiService.getConversations(tenantId, userId);
  }

  @Get('chat/conversations/:id/messages')
  @ApiOperation({ summary: 'Get dialogue history messages for a conversation' })
  getMessages(
    @Param('id') conversationId: string,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.getMessages(conversationId, tenantId);
  }

  @Delete('chat/conversations/:id')
  @ApiOperation({ summary: 'Delete a chat conversation history log' })
  async deleteConversation(
    @Param('id') conversationId: string,
    @TenantId() tenantId: string,
  ): Promise<{ success: boolean }> {
    await this.aiService.deleteConversation(conversationId, tenantId);
    return { success: true };
  }

  // ─── Prompt Library CRUD ──────────────────────────────────────────────────
  @Post('prompts')
  @ApiOperation({ summary: 'Create a prompt template' })
  createPrompt(
    @Body() dto: CreatePromptDto,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.createPrompt(dto, tenantId);
  }

  @Get('prompts')
  @ApiOperation({ summary: 'List all prompts for the tenant' })
  findAllPrompts(@TenantId() tenantId: string) {
    return this.aiService.findAllPrompts(tenantId);
  }

  @Get('prompts/:id')
  @ApiOperation({ summary: 'Get a single prompt template' })
  findOnePrompt(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.findOnePrompt(id, tenantId);
  }

  @Patch('prompts/:id')
  @ApiOperation({ summary: 'Update prompt parameters' })
  updatePrompt(
    @Param('id') id: string,
    @Body() dto: UpdatePromptDto,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.updatePrompt(id, dto, tenantId);
  }

  @Delete('prompts/:id')
  @ApiOperation({ summary: 'Delete prompt template' })
  deletePrompt(
    @Param('id') id: string,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.deletePrompt(id, tenantId);
  }

  // ─── CRM AI Insights ──────────────────────────────────────────────────────
  @Get('insights')
  @ApiOperation({ summary: 'Generate telemetry reports based on tenant CRM data' })
  getInsights(@TenantId() tenantId: string) {
    return this.aiService.getInsights(tenantId);
  }

  // ─── AI Autopilot Config ──────────────────────────────────────────────────
  @Get('agent/config')
  @ApiOperation({ summary: 'Get the AI autopilot settings' })
  getAgentConfig(@TenantId() tenantId: string) {
    return this.aiService.getAgentConfig(tenantId);
  }

  @Patch('agent/config')
  @ApiOperation({ summary: 'Update AI autopilot settings' })
  updateAgentConfig(
    @Body() dto: AgentConfigDto,
    @TenantId() tenantId: string,
  ) {
    return this.aiService.updateAgentConfig(tenantId, dto);
  }
}
