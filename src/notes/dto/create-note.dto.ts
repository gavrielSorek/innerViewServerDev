export class CreateNoteDto {
  clientId: string;
  title: string; // <-- ADD THIS LINE
  content: string;
}