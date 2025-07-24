import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type ClientDocument = Client & Document;

@Schema()
export class Client {
  @Prop()
  name: string;

  @Prop()
  age: number;

  @Prop()
  phone: string;

  @Prop()
  email: string;

  @Prop()
  purpose: string;

  @Prop()
  status: string;

  @Prop()
  notes: string;

  @Prop()
  openingDate: string;

  @Prop()
  userId: string;
}

export const ClientSchema = SchemaFactory.createForClass(Client);