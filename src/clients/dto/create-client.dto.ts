// src/clients/dto/create-client.dto.ts
export class CreateClientDto {
  readonly name: string;
  readonly age: number;
  readonly phone: string;
  readonly email: string;
  readonly purpose: string;
  readonly status: string;
  readonly notes: string;
  readonly openingDate: string;
}