import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema()
export class Note {
  @Prop({ required: true })
  content: string;

  @Prop({ required: true })
  clientId: string;

  @Prop({ required: true, index: true })
  userId: string;

  @Prop()
  createdAt: string;

  @Prop()
  updatedAt: string;
}

export const NoteSchema = SchemaFactory.createForClass(Note);