// file: src/preferences/schemas/user-preference.schema.ts 
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose'; 
import { Document } from 'mongoose'; 
 
export type UserPreferenceDocument = UserPreference & Document; 
 
@Schema() 
export class UserPreference { 
  @Prop({ required: true, unique: true, index: true }) 
  userId: string; 
 
  @Prop({ required: true, default: 'en' }) 
  languageCode: string; 
 
  // Add other preference fields as needed 
  // @Prop({ default: 'light' }) 
  // theme?: string; 
  // 
  // @Prop({ default: true }) 
  // notifications?: boolean; 
} 
 
export const UserPreferenceSchema = SchemaFactory.createForClass(UserPreference); 
