import { IsString, IsNotEmpty, IsArray, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateBroadcastDto {
  @ApiProperty({ description: 'Name of the broadcast marketing campaign' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'ID of the approved message template to send' })
  @IsString()
  @IsNotEmpty()
  templateId!: string;

  @ApiProperty({ description: 'Array of customer phone numbers to send the template to' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  phoneNumbers!: string[];
}
