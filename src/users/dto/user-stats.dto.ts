// src/users/dto/user-stats.dto.ts
export class UserStatsDto {
  readonly userId: string;
  readonly totalClients: number;
  readonly totalMeetings: number;
  readonly totalNotes: number;
  readonly totalAnalyses: number;
  readonly lastActivityAt?: Date;
}