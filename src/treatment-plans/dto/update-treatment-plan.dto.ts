// src/treatment-plans/dto/update-treatment-plan.dto.ts
import { PartialType } from '@nestjs/mapped-types';
import { CreateTreatmentPlanDto } from './create-treatment-plan.dto';
import { IsString, IsOptional } from 'class-validator';

export class UpdateTreatmentPlanDto extends PartialType(CreateTreatmentPlanDto) {
  @IsString()
  @IsOptional()
  status?: 'active' | 'completed' | 'archived';

  @IsString()
  @IsOptional()
  notes?: string;
}