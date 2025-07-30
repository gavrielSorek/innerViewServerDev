// src/usage-tracking/usage-tracking.module.ts
import { Module, Global } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsageTrackingService } from './usage-tracking.service';
import { UsageTrackingController } from './usage-tracking.controller';
import {
  UsageTracking,
  UsageTrackingSchema,
} from './schemas/usage-tracking.schema';
import { UsersModule } from '../users/users.module';

@Global()
@Module({
  imports: [
    MongooseModule.forFeature([
      { name: UsageTracking.name, schema: UsageTrackingSchema },
    ]),
    UsersModule,
  ],
  controllers: [UsageTrackingController],
  providers: [UsageTrackingService],
  exports: [UsageTrackingService],
})
export class UsageTrackingModule {}