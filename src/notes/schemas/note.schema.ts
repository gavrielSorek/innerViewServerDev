import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type NoteDocument = Note & Document;

@Schema()
export class Note {
  @Prop()
  content: string;

  @Prop()
  clientId: string;
}

export const NoteSchema = SchemaFactory.createForClass(Note);