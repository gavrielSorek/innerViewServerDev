// DTO for processing a single analysis round.  The additionalContext
// property allows the therapist to supply extra information for the AI.
export class ProcessRoundDto {
  readonly sessionId!: string;
  readonly roundNumber!: number;
  readonly additionalContext?: Record<string, any>;
}
