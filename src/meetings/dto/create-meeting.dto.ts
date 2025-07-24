export class CreateMeetingDto {
  readonly userId: string;
  readonly clientId: string;
  readonly date: string;
  readonly time?: string;     // optional, to match the schema
  readonly summary: string;
}
