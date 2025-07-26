// src/futuregraph/dto/start-session.dto.ts
export class StartSessionDto {
  readonly userId: string;
  readonly clientId: string;
  readonly handwritingImage: string;
  readonly clientContext?: Record<string, any>;
}