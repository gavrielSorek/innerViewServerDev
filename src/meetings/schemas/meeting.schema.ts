import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MeetingDocument = Meeting & Document;

@Schema()
export class Meeting {
  @Prop()
  title: string;

  @Prop()
  date: string;

  @Prop()
  notes: string;

  @Prop()
  clientId: string;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);