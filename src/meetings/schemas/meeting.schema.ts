// file: gavrielsorek/innerviewserver/gavrielSorek-innerViewServer-73734e70b0b4449fab7282e00ec8094e3d1a6c24/src/meetings/schemas/meeting.schema.ts
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type MeetingDocument = Meeting & Document;

@Schema()
export class Meeting {
  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true }) // Changed to required based on Meeting class date
  date: string; // Storing as string to match your DateTime.toIso8601String()

  @Prop({ required: false })
  time?: string; 

  @Prop({ required: true })
  summary: string; 

}

export const MeetingSchema = SchemaFactory.createForClass(Meeting);