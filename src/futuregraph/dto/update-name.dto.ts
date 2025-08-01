// src/futuregraph/dto/update-name.dto.ts
// CREATE NEW FILE:

import { IsString, MaxLength, IsNotEmpty } from 'class-validator';

export class UpdateNameDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(256)
  name: string;
}