// DTO for submitting therapist feedback on an analysis round.
//
// In addition to the session identifier, round number, free‑form
// feedback and approval flag, this object may carry an optional
// `language` property.  Passing a language here will override the
// session's default language for any subsequent AI reprocessing of
// the round.  Valid values are "en" and "he"; omitted defaults
// to English.
export class SubmitFeedbackDto {
  /** Identifier of the FutureGraph session */
  readonly sessionId!: string;

  /** Round number to which the feedback applies */
  readonly roundNumber!: number;

  /** Therapist's free‑form feedback for the AI */
  readonly feedback!: string;

  /** Whether the therapist approves the analysis for this round */
  readonly approved!: boolean;

  /** Optional language override for future processing of this round */
  readonly language?: string;
}