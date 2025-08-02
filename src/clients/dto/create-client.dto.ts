// src/clients/dto/create-client.dto.ts
// Updated with Swagger decorators

import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNumber, IsEmail, IsOptional, Min, Max } from 'class-validator';

export class CreateClientDto {
  @ApiProperty({
    description: 'Client full name',
    example: 'John Doe',
  })
  @IsString()
  readonly name: string;

  @ApiProperty({
    description: 'Client age',
    example: 35,
    minimum: 1,
    maximum: 120,
  })
  @IsNumber()
  @Min(1)
  @Max(120)
  readonly age: number;

  @ApiProperty({
    description: 'Client phone number',
    example: '+1234567890',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly phone?: string;

  @ApiProperty({
    description: 'Client email address',
    example: 'john.doe@example.com',
    required: false,
  })
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @ApiProperty({
    description: 'Purpose of therapy',
    example: 'Anxiety management',
  })
  @IsString()
  readonly purpose: string;

  @ApiProperty({
    description: 'Client status',
    example: 'active',
    enum: ['active', 'inactive', 'completed'],
  })
  @IsString()
  readonly status: string;

  @ApiProperty({
    description: 'Additional notes about the client',
    example: 'Prefers morning sessions',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly notes?: string;

  @ApiProperty({
    description: 'Client opening date',
    example: '2024-01-01',
  })
  @IsString()
  readonly openingDate: string;

  // userId is typically added by the controller, make it optional in DTO
  @ApiProperty({
    description: 'User ID (auto-populated)',
    required: false,
  })
  @IsString()
  @IsOptional()
  readonly userId?: string;
}
