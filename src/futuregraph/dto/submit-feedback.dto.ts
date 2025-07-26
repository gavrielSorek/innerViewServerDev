// src/futuregraph/dto/submit-feedback.dto.ts
export class SubmitFeedbackDto {
  readonly sessionId: string;
  readonly roundNumber: number;
  readonly feedback: string;
  readonly approved: boolean;
}