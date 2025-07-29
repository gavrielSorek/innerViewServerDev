// src/users/dto/sync-user.dto.ts
export class SyncUserDto {
  readonly firebaseUid: string;
  readonly email: string;
  readonly fullName?: string;
  readonly phoneNumber?: string;
  readonly profilePicture?: string;
}
