import { IsString, IsOptional, IsObject, IsNumber, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LogEventDto {
  @ApiProperty({ description: 'The event action/name', example: 'USER_LOGIN' })
  @IsString()
  event!: string;

  @ApiProperty({ description: 'Status of the event', example: 'SUCCESS' })
  @IsString()
  status!: string;

  @ApiPropertyOptional({ description: 'Additional metadata' })
  @IsObject()
  @IsOptional()
  meta?: Record<string, any>;

  @ApiPropertyOptional({ description: 'IP address associated with the event' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ description: 'Processing duration in milliseconds' })
  @IsNumber()
  @IsOptional()
  duration?: number;

  @ApiPropertyOptional({ description: 'Timestamp of the event' })
  @IsDateString()
  @IsOptional()
  timestamp?: string;
}
