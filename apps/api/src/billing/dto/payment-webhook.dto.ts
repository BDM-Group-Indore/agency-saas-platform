import { IsString, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentWebhookDto {
  @ApiProperty({ example: 'payment.succeeded', description: 'Event identifier string' })
  @IsString()
  event!: string;

  @ApiProperty({ example: 'inv_12345678', description: 'Invoice ID' })
  @IsString()
  invoiceId!: string;

  @ApiProperty({ example: 2140.0, description: 'Transaction payment amount' })
  @IsNumber()
  amount!: number;

  @ApiProperty({ example: 'ch_3MtgX2LkdIwHu7ix1aB8y', description: 'Gateway transaction reference' })
  @IsString()
  gatewayTransactionId!: string;

  @ApiProperty({ example: 'STRIPE', description: 'Payment gateway method' })
  @IsString()
  paymentMethod!: string;
}
