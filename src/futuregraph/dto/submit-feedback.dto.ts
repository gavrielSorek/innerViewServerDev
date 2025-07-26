// DTO for submitting therapist feedback on an analysis round.
export class SubmitFeedbackDto {
  readonly sessionId!: string;
  readonly roundNumber!: number;
  readonly feedback!: string;
  readonly approved!: boolean;
}
