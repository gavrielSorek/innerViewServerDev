import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { FuturegraphController } from './futuregraph.controller';
import { FuturegraphService } from './futuregraph.service';
import {
  FuturegraphSession,
  FuturegraphSessionSchema,
} from './schemas/futuregraph-session.schema';
import { AiService } from './ai.service';
import { LanguageService } from '../common/language.service';
import { UsersModule } from '../users/users.module'; // <-- Import UsersModule

@Global()
@Module({
  imports: [
    ConfigModule,
    UsersModule, // <-- Add UsersModule here!
    MongooseModule.forFeature([
      { name: FuturegraphSession.name, schema: FuturegraphSessionSchema },
    ]),
  ],
  controllers: [FuturegraphController],
  providers: [FuturegraphService, AiService, LanguageService],
  exports: [FuturegraphService, MongooseModule],
})
export class FuturegraphModule {}
