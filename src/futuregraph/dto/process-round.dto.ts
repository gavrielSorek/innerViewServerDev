// src/futuregraph/dto/process-round.dto.ts
export class ProcessRoundDto {
  readonly sessionId: string;
  readonly roundNumber: number;
  readonly additionalContext?: Record<string, any>;
}