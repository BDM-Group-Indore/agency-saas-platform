import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReceiveWebhookDto {
  @ApiProperty({ description: 'Sender customer WhatsApp phone number' })
  @IsString()
  @IsNotEmpty()
  phoneNumber!: string;

  @ApiProperty({ description: 'Text body content of incoming message' })
  @IsString()
  @IsNotEmpty()
  body!: string;
}
