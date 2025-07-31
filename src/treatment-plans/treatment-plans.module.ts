// src/treatment-plans/treatment-plans.module.ts
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';
import { TreatmentPlansController } from './treatment-plans.controller';
import { TreatmentPlansService } from './treatment-plans.service';
import { TreatmentPlanAiService } from './treatment-plan-ai.service';
import {
  TreatmentPlan,
  TreatmentPlanSchema,
} from './schemas/treatment-plan.schema';
import { FuturegraphModule } from '../futuregraph/futuregraph.module';
import { UsageTrackingModule } from '../usage-tracking/usage-tracking.module';
import { LanguageService } from '../common/language.service';

@Module({
  imports: [
    ConfigModule,
    MongooseModule.forFeature([
      { name: TreatmentPlan.name, schema: TreatmentPlanSchema },
    ]),
    FuturegraphModule,
    UsageTrackingModule,
  ],
  controllers: [TreatmentPlansController],
  providers: [
    TreatmentPlansService,
    TreatmentPlanAiService,
    LanguageService,
  ],
  exports: [TreatmentPlansService],
})
export class TreatmentPlansModule {}