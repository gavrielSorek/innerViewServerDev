export class CreateMeetingDto {
  readonly userId: string;
  readonly clientId: string;
  readonly date: string;
  readonly time?: string;
  readonly summary: string;
}