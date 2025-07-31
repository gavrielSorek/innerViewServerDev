// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { MeetingsModule } from './meetings/meetings.module';
import { NotesModule } from './notes/notes.module';
import { PreferencesModule } from './preferences/preferences.module';
import { FuturegraphModule } from './futuregraph/futuregraph.module';
import { AiModule } from './ai/ai.module';
import { WebhooksModule } from './webhooks/webhooks.module';
import { UsageTrackingModule } from './usage-tracking/usage-tracking.module';
import { TreatmentPlansModule } from './treatment-plans/treatment-plans.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get('MONGO_URI'),
      }),
      inject: [ConfigService],
    }),
    AuthModule,
    UsersModule,
    ClientsModule,
    MeetingsModule,
    NotesModule,
    PreferencesModule,
    FuturegraphModule,
    AiModule,
    WebhooksModule,
    UsageTrackingModule,
    TreatmentPlansModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}