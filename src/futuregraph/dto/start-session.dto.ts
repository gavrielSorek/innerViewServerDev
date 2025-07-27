// Data Transfer Object for creating a new FutureGraph session.
//
// A session encapsulates the user's handwriting sample and any contextual
// metadata required to perform the FutureGraph analysis.  A new optional
// `language` field allows callers to specify the desired response language.
// Supported values are "en" (English) and "he" (Hebrew); if omitted, the
// server will default to English.  The `clientContext` property is typed
// as a Record<string, any> to allow arbitrary keys.
export class StartSessionDto {
  /** Unique identifier of the therapist making the request */
  readonly userId!: string;

  /** Identifier of the client whose handwriting is being analysed */
  readonly clientId!: string;

  /** Base64‑encoded JPEG of the handwriting sample */
  readonly handwritingImage!: string;

  /** Optional structured metadata about the client */
  readonly clientContext?: Record<string, any>;

  /**
   * Optional language code indicating the preferred language of AI outputs.
   * Accepted values are:
   *  - "en": English (default)
   *  - "he": Hebrew
   */
  readonly language?: string;
}

// src/futuregraph/dto/start-session.dto.ts
// Keep the same for backward compatibility

// src/futuregraph/dto/process-round.dto.ts
// Mark as deprecated
export class ProcessRoundDto {
  /** @deprecated Use the new single-round analysis endpoint instead */
  readonly sessionId!: string;
  /** @deprecated Rounds are no longer used */
  readonly roundNumber!: number;
  readonly additionalContext?: Record<string, any>;
  readonly language?: string;
}

// src/futuregraph/dto/submit-feedback.dto.ts
// Mark as deprecated
export class SubmitFeedbackDto {
  /** @deprecated Feedback is no longer needed in single-round analysis */
  readonly sessionId!: string;
  /** @deprecated Rounds are no longer used */
  readonly roundNumber!: number;
  readonly feedback!: string;
  readonly approved!: boolean;
  readonly language?: string;
}