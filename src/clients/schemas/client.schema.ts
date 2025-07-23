import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

// Add export here
export type ClientDocument = Client & Document;

@Schema()
// And add export here
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
}

// And finally, add export here
export const ClientSchema = SchemaFactory.createForClass(Client);