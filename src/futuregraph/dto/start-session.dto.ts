// Data Transfer Object for creating a new FutureGraph session.  The
// clientContext property is typed as a Record to allow arbitrary keys.
export class StartSessionDto {
  readonly userId!: string;
  readonly clientId!: string;
  readonly handwritingImage!: string;
  readonly clientContext?: Record<string, any>;
}
