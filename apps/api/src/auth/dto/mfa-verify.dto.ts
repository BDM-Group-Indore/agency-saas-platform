import { ApiProperty } from '@nestjs/swagger';
import { IsString, Length } from 'class-validator';

export class MfaVerifyDto {
  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  @IsString()
  @Length(6, 6)
  totpCode: string;
}

export class MfaLoginVerifyDto {
  @ApiProperty({ description: 'Short-lived MFA pending token returned on login' })
  @IsString()
  pendingToken: string;

  @ApiProperty({ description: '6-digit TOTP code from authenticator app', example: '123456' })
  @IsString()
  @Length(6, 6)
  totpCode: string;
}
