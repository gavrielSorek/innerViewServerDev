// Schema definition for storing FutureGraph handwriting images separately
// from session documents. Each image document is keyed by the sessionId,
// allowing the heavy base64 encoded image to be retrieved on demand while
// keeping the session payload lightweight.

import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type FuturegraphImageDocument = FuturegraphImage & Document;

@Schema()
export class FuturegraphImage {
  /**
   * The session identifier associated with this image. This should match
   * the sessionId field on FuturegraphSession documents.
   */
  @Prop({ required: true, unique: true, index: true })
  sessionId!: string;

  /**
   * Base64 encoded JPEG of the handwriting sample. Stored separately to
   * reduce the size of the FuturegraphSession document.
   */
  @Prop({ required: true })
  image!: string;
}

export const FuturegraphImageSchema = SchemaFactory.createForClass(FuturegraphImage);