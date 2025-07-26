import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MeetingDocument = Meeting & Document;

@Schema()
export class Meeting {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true })
  date: string;

  @Prop({ required: false })
  time?: string;

  @Prop({ required: true })
  summary: string;
}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);