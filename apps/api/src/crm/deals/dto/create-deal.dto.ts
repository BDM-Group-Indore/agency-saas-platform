import { IsEnum, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DealStatus } from '@saas/shared-types';

export class CreateDealDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  title!: string;

  @ApiPropertyOptional()
  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @ApiPropertyOptional({ enum: DealStatus, default: DealStatus.OPEN })
  @IsEnum(DealStatus)
  @IsOptional()
  status: DealStatus = DealStatus.OPEN;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  stageId!: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  contactId?: string;
}
