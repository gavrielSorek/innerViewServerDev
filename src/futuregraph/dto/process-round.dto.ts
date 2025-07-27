// DTO for processing a single analysis round.
//
// Includes the `sessionId` of the ongoing FutureGraph analysis, the
// `roundNumber` to process, any therapist‑provided `additionalContext`,
// and an optional `language` field.  The language code propagates
// through the pipeline so that prompts, QA checks and summaries are
// generated in the requested language.
export class ProcessRoundDto {
  /** Identifier of the active FutureGraph session */
  readonly sessionId!: string;

  /** Round number to process (1‑10) */
  readonly roundNumber!: number;

  /** Additional therapist context supplied for the round */
  readonly additionalContext?: Record<string, any>;

  /**
   * Optional language code indicating the preferred language of AI outputs.
   * Accepted values are:
   *  - "en": English (default)
   *  - "he": Hebrew
   */
  readonly language?: string;
}