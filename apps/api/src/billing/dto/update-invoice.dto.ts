import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export enum UpdateInvoiceStatusAction {
  SEND = 'SEND',
  MARK_PAID = 'MARK_PAID',
  VOID = 'VOID',
}

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: UpdateInvoiceStatusAction })
  @IsOptional()
  @IsEnum(UpdateInvoiceStatusAction)
  action?: UpdateInvoiceStatusAction;

  @ApiPropertyOptional({ example: 'Updated payment terms' })
  @IsOptional()
  @IsString()
  notes?: string;
}
