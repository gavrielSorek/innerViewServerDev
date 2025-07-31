// src/futuregraph/futuregraph.module.ts
import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { FuturegraphController } from './futuregraph.controller';
import { FuturegraphService } from './futuregraph.service';
import {
  FuturegraphSession,
  FuturegraphSessionSchema,
} from './schemas/futuregraph-session.schema';
import {
  FuturegraphImage,
  FuturegraphImageSchema,
} from './schemas/futuregraph-image.schema';
import {
  FuturegraphFocusReport,
  FuturegraphFocusReportSchema,
} from './schemas/futuregraph-focus-report.schema';
import { AiService } from './ai.service';
import { LanguageService } from '../common/language.service';
import { UsersModule } from '../users/users.module';
import { UsageTrackingModule } from '../usage-tracking/usage-tracking.module';

@Global()
@Module({
  imports: [
    ConfigModule,
    UsersModule,
    UsageTrackingModule,
    MongooseModule.forFeature([
      { name: FuturegraphSession.name, schema: FuturegraphSessionSchema },
      { name: FuturegraphImage.name, schema: FuturegraphImageSchema },
      { name: FuturegraphFocusReport.name, schema: FuturegraphFocusReportSchema },
    ]),
  ],
  controllers: [FuturegraphController],
  providers: [FuturegraphService, AiService, LanguageService],
  exports: [FuturegraphService, MongooseModule],
})
export class FuturegraphModule {}