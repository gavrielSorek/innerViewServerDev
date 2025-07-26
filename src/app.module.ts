import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClientsModule } from './clients/clients.module';
import { MeetingsModule } from './meetings/meetings.module';
import { NotesModule } from './notes/notes.module';
import { PreferencesModule } from './preferences/preferences.module';
import { FuturegraphModule } from './futuregraph/futuregraph.module'; // NEW
import { AiModule } from './ai/ai.module'; // NEW

@Module({
  imports: [
    ConfigModule.forRoot(), // Load the .env file
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    ClientsModule,
    MeetingsModule,
    NotesModule,
    PreferencesModule,
    FuturegraphModule, 
    AiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}