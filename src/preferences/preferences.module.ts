// file: src/preferences/preferences.module.ts 
import { Module } from '@nestjs/common'; 
import { MongooseModule } from '@nestjs/mongoose'; 
import { PreferencesController } from './preferences.controller'; 
import { PreferencesService } from './preferences.service'; 
import { UserPreference, UserPreferenceSchema } from './schemas/user-preference.schema'; 
 
@Module({ 
  imports: [ 
    MongooseModule.forFeature([ 
      { name: UserPreference.name, schema: UserPreferenceSchema } 
    ]) 
  ], 
  controllers: [PreferencesController], 
  providers: [PreferencesService], 
  exports: [PreferencesService], // Export service in case other modules need it 
}) 
export class PreferencesModule {} 
