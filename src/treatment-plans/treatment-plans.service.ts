// src/treatment-plans/treatment-plans.service.ts
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  TreatmentPlan,
  TreatmentPlanDocument,
  SessionDetail,
} from './schemas/treatment-plan.schema';
import { CreateTreatmentPlanDto } from './dto/create-treatment-plan.dto';
import { UpdateTreatmentPlanDto } from './dto/update-treatment-plan.dto';
import { TreatmentPlanResponse } from './dto/treatment-plan-response.dto';
import { FuturegraphService } from '../futuregraph/futuregraph.service';
import { TreatmentPlanAiService } from './treatment-plan-ai.service';
import { LanguageService, SupportedLanguage } from '../common/language.service';

@Injectable()
export class TreatmentPlansService {
  constructor(
    @InjectModel(TreatmentPlan.name)
    private treatmentPlanModel: Model<TreatmentPlanDocument>,
    private futuregraphService: FuturegraphService,
    private treatmentPlanAiService: TreatmentPlanAiService,
    private languageService: LanguageService,
  ) {}

  /**
   * Create a new treatment plan based on FutureGraph analysis
   */
  async create(
    userId: string,
    createDto: CreateTreatmentPlanDto,
  ): Promise<TreatmentPlanResponse> {
    // Fetch the FutureGraph session and verify ownership
    const { session, analysis, report } = await this.futuregraphService.getAnalysisSession(
      createDto.futuregraphSessionId,
      false,
    );

    if (session.userId !== userId) {
      throw new ForbiddenException('You can only create treatment plans for your own sessions');
    }

    // Generate unique plan ID
    const planId = `tp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Validate language
    const language = this.languageService.validate(createDto.language || session.language);

    // Use AI to generate the treatment plan based on FutureGraph analysis
    const generatedPlan = await this.treatmentPlanAiService.generateTreatmentPlan({
      analysis,
      report,
      clientContext: session.clientContext,
      numberOfSessions: createDto.numberOfSessions,
      sessionDuration: createDto.sessionDuration || 50,
      overallGoal: createDto.overallGoal,
      preferredMethods: createDto.preferredMethods || [],
      language,
    });

    // Create the treatment plan document
    const treatmentPlan = new this.treatmentPlanModel({
      planId,
      futuregraphSessionId: createDto.futuregraphSessionId,
      userId,
      clientId: session.clientId,
      numberOfSessions: createDto.numberOfSessions,
      sessionDuration: createDto.sessionDuration || 50,
      overallGoal: generatedPlan.overallGoal,
      preferredMethods: generatedPlan.preferredMethods,
      treatmentApproach: generatedPlan.treatmentApproach,
      language,
      sessions: generatedPlan.sessions,
      summary: generatedPlan.summary,
      clientContext: session.clientContext,
      status: 'active',
      notes: createDto.notes,
    });

    await treatmentPlan.save();

    return this.formatResponse(treatmentPlan);
  }

  /**
   * Get all treatment plans for a user
   */
  async findAll(
    userId: string,
    filters?: {
      clientId?: string;
      status?: string;
      limit?: number;
    },
  ): Promise<TreatmentPlanResponse[]> {
    const query: any = { userId };

    if (filters?.clientId) {
      query.clientId = filters.clientId;
    }

    if (filters?.status) {
      query.status = filters.status;
    }

    const plans = await this.treatmentPlanModel
      .find(query)
      .sort('-createdAt')
      .limit(filters?.limit || 20)
      .exec();

    return plans.map(plan => this.formatResponse(plan));
  }

  /**
   * Get a specific treatment plan
   */
  async findOne(planId: string, userId: string): Promise<TreatmentPlanResponse> {
    const plan = await this.treatmentPlanModel.findOne({ planId }).exec();

    if (!plan) {
      throw new NotFoundException('Treatment plan not found');
    }

    if (plan.userId !== userId) {
      throw new ForbiddenException('You can only view your own treatment plans');
    }

    return this.formatResponse(plan);
  }

  /**
   * Update a treatment plan
   */
  async update(
    planId: string,
    userId: string,
    updateDto: UpdateTreatmentPlanDto,
  ): Promise<TreatmentPlanResponse> {
    const plan = await this.treatmentPlanModel.findOne({ planId, userId }).exec();

    if (!plan) {
      throw new NotFoundException('Treatment plan not found');
    }

    Object.assign(plan, updateDto);
    await plan.save();

    return this.formatResponse(plan);
  }

  /**
   * Delete a treatment plan
   */
  async remove(planId: string, userId: string): Promise<{ deleted: boolean }> {
    const result = await this.treatmentPlanModel.deleteOne({ planId, userId }).exec();

    if (result.deletedCount === 0) {
      throw new NotFoundException('Treatment plan not found');
    }

    return { deleted: true };
  }

  /**
   * Get treatment plans for a specific client
   */
  async findByClient(
    clientId: string,
    userId: string,
  ): Promise<TreatmentPlanResponse[]> {
    const plans = await this.treatmentPlanModel
      .find({ clientId, userId })
      .sort('-createdAt')
      .exec();

    return plans.map(plan => this.formatResponse(plan));
  }

  /**
   * Get treatment plans for a specific FutureGraph session
   */
  async findBySession(
    futuregraphSessionId: string,
    userId: string,
  ): Promise<TreatmentPlanResponse[]> {
    const plans = await this.treatmentPlanModel
      .find({ futuregraphSessionId, userId })
      .sort('-createdAt')
      .exec();

    return plans.map(plan => this.formatResponse(plan));
  }

  /**
   * Archive a treatment plan
   */
  async archive(planId: string, userId: string): Promise<TreatmentPlanResponse> {
    return this.update(planId, userId, { status: 'archived' });
  }

  /**
   * Mark a treatment plan as completed
   */
  async complete(planId: string, userId: string): Promise<TreatmentPlanResponse> {
    return this.update(planId, userId, { status: 'completed' });
  }

  /**
   * Format treatment plan for response
   */
  private formatResponse(plan: TreatmentPlanDocument): TreatmentPlanResponse {
    return {
      planId: plan.planId,
      futuregraphSessionId: plan.futuregraphSessionId,
      clientId: plan.clientId,
      numberOfSessions: plan.numberOfSessions,
      sessionDuration: plan.sessionDuration,
      overallGoal: plan.overallGoal,
      treatmentApproach: plan.treatmentApproach,
      language: plan.language,
      sessions: plan.sessions,
      summary: plan.summary || {
        keyThemes: [],
        progressionStrategy: '',
        adaptationGuidelines: '',
        expectedOutcomes: [],
      },
      createdAt: plan.createdAt,
      updatedAt: plan.updatedAt,
      status: plan.status,
    };
  }
}