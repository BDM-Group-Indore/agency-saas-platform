import { IsString, IsNotEmpty, IsOptional, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateTemplateDto {
  @ApiProperty({ description: 'Unique name of the message template' })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ description: 'Category of template (e.g. MARKETING, UTILITY, AUTHENTICATION)', default: 'UTILITY' })
  @IsString()
  @IsNotEmpty()
  category!: string;

  @ApiPropertyOptional({ description: 'Language code', default: 'en_US' })
  @IsString()
  @IsOptional()
  language?: string;

  @ApiProperty({ description: 'JSON structure of header, body, footer, and buttons component blocks' })
  @IsArray()
  components!: any[];
}
