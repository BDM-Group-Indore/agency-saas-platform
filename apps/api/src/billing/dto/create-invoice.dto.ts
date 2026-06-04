import { IsString, IsNumber, IsOptional, IsArray, IsEmail, IsDateString, ValidateNested, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class LineItemDto {
  @ApiProperty({ example: 'Social Media Management - June 2026' })
  @IsString()
  description: string;

  @ApiProperty({ example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 2140.0 })
  @IsNumber()
  @Min(0)
  unitPrice: number;

  @ApiProperty({ example: 2140.0 })
  @IsNumber()
  @Min(0)
  total: number;
}

export class CreateInvoiceDto {
  @ApiProperty({ example: 'BDM Group Indore' })
  @IsString()
  clientName: string;

  @ApiPropertyOptional({ example: 'billing@bdm.in' })
  @IsOptional()
  @IsEmail()
  clientEmail?: string;

  @ApiProperty({ example: '2026-07-01T00:00:00.000Z' })
  @IsDateString()
  dueDate: string;

  @ApiProperty({ example: 'USD' })
  @IsOptional()
  @IsString()
  currency?: string;

  @ApiProperty({ type: [LineItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LineItemDto)
  lineItems: LineItemDto[];

  @ApiPropertyOptional({ example: 'Thank you for your business.' })
  @IsOptional()
  @IsString()
  notes?: string;
}
