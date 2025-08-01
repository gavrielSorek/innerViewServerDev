// src/treatment-plans/treatment-plans.controller.ts
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  Ip,
  Headers,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { TreatmentPlansService } from './treatment-plans.service';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { AuthGuard } from '../auth/auth.guard';
import { UsageTrackingService } from '../usage-tracking/usage-tracking.service';
import { UsageType } from '../usage-tracking/schemas/usage-tracking.schema';

@Controller('ai/treatment-plans')
@UseGuards(AuthGuard)
export class TreatmentPlansController {
  constructor(
    private readonly treatmentPlansService: TreatmentPlansService,
    private readonly usageTrackingService: UsageTrackingService,
  ) {}

  /**
   * Create a new treatment plan
   * Can be created from either a FutureGraph session or a focus report
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Request() req: any,
    @Body() createDto: CreateTreatmentPlanDto,
    @Ip() ip: string,
    @Headers('user-agent') userAgent: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    // Check and enforce usage limit (using FUTUREGRAPH_ANALYZE type for now)
    await this.usageTrackingService.enforceUsageLimit(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
      {
        feature: 'treatment_plan',
        sessionId: createDto.futuregraphSessionId,
        focusReportId: createDto.focusReportId,
        numberOfSessions: createDto.numberOfSessions,
      },
      ip,
      userAgent,
    );

    const startTime = Date.now();
    const plan = await this.treatmentPlansService.create(userId, createDto);
    const responseTime = Date.now() - startTime;

    // Track usage
    await this.usageTrackingService.trackUsage(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
      {
        feature: 'treatment_plan',
        planId: plan.planId,
        responseTime,
        success: true,
      },
    );

    // Get updated usage stats
    const usageCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
    );

    // Add usage info if approaching limit
    if (usageCheck.remaining <= 1 || usageCheck.message) {
      plan.usage = {
        remaining: usageCheck.remaining,
        limit: usageCheck.limit,
        message: usageCheck.message,
      };
    }

    return plan;
  }

  /**
   * Get all treatment plans for the current user
   */
  @Get()
  async findAll(
    @Request() req: any,
    @Query('clientId') clientId?: string,
    @Query('status') status?: string,
    @Query('limit') limit?: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const filters = {
      clientId,
      status,
      limit: limit ? parseInt(limit, 10) : undefined,
    };

    const plans = await this.treatmentPlansService.findAll(userId, filters);

    return {
      plans,
      total: plans.length,
    };
  }

  /**
   * Get treatment plans for a specific client
   */
  @Get('client/:clientId')
  async findByClient(
    @Request() req: any,
    @Param('clientId') clientId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const plans = await this.treatmentPlansService.findByClient(clientId, userId);

    return {
      clientId,
      plans,
      total: plans.length,
    };
  }

  /**
   * Get treatment plans for a specific FutureGraph session
   */
  @Get('session/:sessionId')
  async findBySession(
    @Request() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const plans = await this.treatmentPlansService.findBySession(sessionId, userId);

    return {
      sessionId,
      plans,
      total: plans.length,
    };
  }

  /**
   * Get a specific treatment plan
   */
  @Get(':planId')
  async findOne(
    @Request() req: any,
    @Param('planId') planId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    return this.treatmentPlansService.findOne(planId, userId);
  }

  /**
   * Update a treatment plan
   */
  @Patch(':planId')
  async update(
    @Request() req: any,
    @Param('planId') planId: string,
    @Body() updateDto: UpdateTreatmentPlanDto,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    return this.treatmentPlansService.update(planId, userId, updateDto);
  }

  /**
   * Archive a treatment plan
   */
  @Post(':planId/archive')
  @HttpCode(HttpStatus.OK)
  async archive(
    @Request() req: any,
    @Param('planId') planId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const plan = await this.treatmentPlansService.archive(planId, userId);

    return {
      plan,
      message: 'Treatment plan archived successfully',
    };
  }

  /**
   * Mark a treatment plan as completed
   */
  @Post(':planId/complete')
  @HttpCode(HttpStatus.OK)
  async complete(
    @Request() req: any,
    @Param('planId') planId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const plan = await this.treatmentPlansService.complete(planId, userId);

    return {
      plan,
      message: 'Treatment plan marked as completed',
    };
  }

  /**
   * Delete a treatment plan
   */
  @Delete(':planId')
  async remove(
    @Request() req: any,
    @Param('planId') planId: string,
  ) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const result = await this.treatmentPlansService.remove(planId, userId);

    return {
      ...result,
      message: 'Treatment plan deleted successfully',
    };
  }

  /**
   * Check usage before creating a treatment plan
   */
  @Get('check-usage')
  async checkUsage(@Request() req: any) {
    const userId = req.user.uid || req.user.dbUser?.firebaseUid;

    const usageCheck = await this.usageTrackingService.checkUsageLimit(
      userId,
      UsageType.FUTUREGRAPH_ANALYZE,
    );

    return {
      canCreate: usageCheck.allowed,
      usage: {
        used: usageCheck.used,
        limit: usageCheck.limit,
        remaining: usageCheck.remaining,
        resetDate: usageCheck.resetDate,
      },
      message: usageCheck.message,
      upgradePrompt: usageCheck.upgradePrompt,
    };
  }
}