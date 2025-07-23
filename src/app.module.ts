import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { ClientsModule } from './clients/clients.module';
import { MeetingsModule } from './meetings/meetings.module';
import { NotesModule } from './notes/notes.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    MongooseModule.forRootAsync({
      useFactory: () => {
        const mongoUri = process.env.MONGO_URI;
        if (!mongoUri) {
          throw new Error('MONGO_URI is not defined in the environment variables');
        }
        return {
          uri: mongoUri,
        };
      },
    }),
    ClientsModule,   // <-- Add this line
    MeetingsModule,  // <-- Add this line
    NotesModule,     // <-- Add this line
  ],
})
export class AppModule {}