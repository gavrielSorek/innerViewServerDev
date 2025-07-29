// src/users/dto/update-role.dto.ts
import { UserRole } from '../schemas/user.schema';

export class UpdateRoleDto {
  readonly role: UserRole;
}