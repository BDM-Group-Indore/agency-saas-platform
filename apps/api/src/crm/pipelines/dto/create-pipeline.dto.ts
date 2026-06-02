import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePipelineDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;
}
