import { IsEnum, IsString, IsNotEmpty } from 'class-validator';

export class FocusAnalysisDto {
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @IsString()
  @IsNotEmpty()
  focus: string;

  @IsString()
  @IsNotEmpty()
  language: string;
}