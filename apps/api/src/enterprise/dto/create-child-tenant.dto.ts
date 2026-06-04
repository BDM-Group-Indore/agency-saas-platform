import { IsString, IsNotEmpty, IsEmail, MinLength, IsOptional, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildTenantDto {
  @ApiProperty({ example: 'Client Agency Network', description: 'Name of the sub-tenant' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'clientagency.saas.com', description: 'Domain or subdomain name' })
  @IsString()
  @IsNotEmpty()
  domain: string;

  @ApiProperty({ example: 'admin@clientagency.com', description: 'Administrator email address' })
  @IsEmail()
  adminEmail: string;

  @ApiProperty({ example: 'securepassword123', description: 'Initial admin password' })
  @IsString()
  @MinLength(6)
  adminPasswordPlain: string;

  @ApiProperty({ example: 'John', description: 'Administrator first name' })
  @IsString()
  @IsNotEmpty()
  adminFirstName: string;

  @ApiPropertyOptional({ example: 'Doe', description: 'Administrator last name' })
  @IsString()
  @IsOptional()
  adminLastName?: string;

  @ApiPropertyOptional({ example: 'https://branding.saas.com/logo.png', description: 'Custom logo URL' })
  @IsString()
  @IsOptional()
  logoUrl?: string;

  @ApiPropertyOptional({ example: '#3b82f6', description: 'Primary hex color' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Primary color must be a valid hex color code' })
  @IsOptional()
  primaryColor?: string;

  @ApiPropertyOptional({ example: '#1f2937', description: 'Secondary hex color' })
  @IsString()
  @Matches(/^#[0-9a-fA-F]{6}$/, { message: 'Secondary color must be a valid hex color code' })
  @IsOptional()
  secondaryColor?: string;
}
