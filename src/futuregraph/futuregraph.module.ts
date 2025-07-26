// NestJS module for the FutureGraph feature.  This module registers the
// MongoDB schema for sessions and wires up the controller and service.
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { FuturegraphController } from './futuregraph.controller';
import { FuturegraphService } from './futuregraph.service';
import { FuturegraphSession, FuturegraphSessionSchema } from './schemas/futuregraph-session.schema';
import { AiService } from './ai.service';

@Module({
  imports: [
    // Pull in configuration values and register the session schema with Mongoose.
    ConfigModule,
    MongooseModule.forFeature([
      { name: FuturegraphSession.name, schema: FuturegraphSessionSchema },
    ]),
  ],
  controllers: [FuturegraphController],
  providers: [FuturegraphService, AiService],
  exports: [FuturegraphService],
})
export class FuturegraphModule {}
