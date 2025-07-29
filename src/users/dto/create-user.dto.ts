// src/users/dto/create-user.dto.ts
export class CreateUserDto {
  readonly fullName: string;
  readonly email: string;
  readonly firebaseUid: string;
  readonly role?: string;
  readonly phoneNumber?: string;
  readonly profilePicture?: string;
}