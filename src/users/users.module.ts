import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { UserStatsService } from './user-stats.service';
import { User, UserSchema } from './schemas/user.schema';
import { Client, ClientSchema } from '../clients/schemas/client.schema';
import { Meeting, MeetingSchema } from '../meetings/schemas/meeting.schema';
import { Note, NoteSchema } from '../notes/schemas/note.schema';
import {
  FuturegraphSession,
  FuturegraphSessionSchema,
} from '../futuregraph/schemas/futuregraph-session.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Client.name, schema: ClientSchema },
      { name: Meeting.name, schema: MeetingSchema },
      { name: Note.name, schema: NoteSchema },
      { name: FuturegraphSession.name, schema: FuturegraphSessionSchema },
    ]),
  ],
  controllers: [UsersController],
  providers: [UsersService, UserStatsService],
  exports: [UsersService],
})
export class UsersModule {}