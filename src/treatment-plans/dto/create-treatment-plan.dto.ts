// src/treatment-plans/dto/create-treatment-plan.dto.ts
import { IsString, IsNumber, IsOptional, IsArray, Min, Max, ValidateIf } from 'class-validator';

export class CreateTreatmentPlanDto {
  @ValidateIf(o => !o.focusReportId)
  @IsString()
  futuregraphSessionId?: string;

  @ValidateIf(o => !o.futuregraphSessionId)
  @IsString()
  focusReportId?: string;

  @IsNumber()
  @Min(1)
  @Max(52) // Maximum 1 year of weekly sessions
  numberOfSessions: number;

  @IsNumber()
  @IsOptional()
  @Min(30)
  @Max(120) // Between 30 and 120 minutes
  sessionDuration?: number;

  @IsString()
  @IsOptional()
  overallGoal?: string;

  @IsArray()
  @IsOptional()
  preferredMethods?: string[];

  @IsString()
  @IsOptional()
  language?: string;

  @IsString()
  @IsOptional()
  notes?: string;
}