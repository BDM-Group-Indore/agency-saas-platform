import { IsString, IsOptional, IsEmail, IsUrl, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBrandingDto {
  @ApiPropertyOptional({ example: 'https://branding.saas.com/logo.png', description: 'Logo image URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Primary hex color theme' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Primary color must be a valid hex color code' })
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#1f2937', description: 'Secondary hex color theme' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Secondary color must be a valid hex color code' })
  @IsOptional()
  secondaryColor?: string;

  @ApiPropertyOptional({ example: 'Acme Marketing Agency', description: 'White label company name' })
  @IsString()
  @IsOptional()
  companyName?: string;

  @ApiPropertyOptional({ example: 'support@acmeagency.com', description: 'Support contact email' })
  @IsEmail()
  @IsOptional()
  supportEmail?: string;
}
