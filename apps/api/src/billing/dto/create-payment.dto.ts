import { IsString, IsNumber, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 2140.0, description: 'Amount to pay' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiProperty({ example: 'STRIPE', description: 'Payment method: STRIPE, RAZORPAY, CASH, BANK_TRANSFER' })
  @IsString()
  paymentMethod: string;

  @ApiPropertyOptional({ example: 'ch_3MtgX2LkdIwHu7ix1aB8y' })
  @IsString()
  @IsOptional()
  gatewayTransactionId?: string;

  @ApiPropertyOptional({ description: 'Raw callback metadata response' })
  @IsObject()
  @IsOptional()
  gatewayResponse?: Record<string, any>;
}
