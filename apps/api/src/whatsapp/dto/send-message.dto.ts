import { IsString, IsOptional, IsEnum, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WhatsAppMessageType } from '@saas/shared-types';

export class SendMessageDto {
  @ApiProperty({ description: 'Destination customer WhatsApp phone number' })
  @IsString()
  phoneNumber!: string;

  @ApiProperty({ description: 'Message body text content' })
  @IsString()
  body!: string;

  @ApiPropertyOptional({ enum: WhatsAppMessageType, default: WhatsAppMessageType.TEXT })
  @IsEnum(WhatsAppMessageType)
  @IsOptional()
  type?: WhatsAppMessageType;

  @ApiPropertyOptional({ description: 'WhatsApp template name if sending a template message' })
  @IsString()
  @IsOptional()
  templateName?: string;

  @ApiPropertyOptional({ description: 'Media attachment URL' })
  @IsUrl()
  @IsOptional()
  mediaUrl?: string;
}
