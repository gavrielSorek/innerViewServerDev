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
import { 
  FuturegraphAnalysis, 
  FuturegraphReport,
  ClientContext 
} from '../common/types';
import { 
  ResourceNotFoundError, 
  ValidationError, 
  AuthorizationError 
} from '../common/errors/custom-errors';

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
    // Validate that either futuregraphSessionId or focusReportId is provided
    if (!createDto.futuregraphSessionId && !createDto.focusReportId) {
      throw new ValidationError('Either futuregraphSessionId or focusReportId must be provided');
    }

    if (createDto.futuregraphSessionId && createDto.focusReportId) {
      throw new ValidationError('Only one of futuregraphSessionId or focusReportId should be provided');
    }

    let session: any;
    let analysis: FuturegraphAnalysis;
    let report: FuturegraphReport;
    let sourceType: 'session' | 'focus-report';
    let focusArea: string | undefined;
    let focusReportId: string | undefined;

    if (createDto.focusReportId) {
      // Creating from focus report
      sourceType = 'focus-report';
      focusReportId = createDto.focusReportId;
      
      // Get the focus report
      const focusReport = await this.futuregraphService.getFocusReportById(
        createDto.focusReportId,
        userId,
      );

      // Get the original session to verify ownership and get client context
      const sessionData = await this.futuregraphService.getAnalysisSession(
        focusReport.sessionId,
        false,
      );

      if (sessionData.session.userId !== userId) {
        throw new AuthorizationError('You can only create treatment plans for your own sessions');
      }

      session = sessionData.session;
      analysis = focusReport.analysis; // Use focused analysis
      report = focusReport.report; // Use focused report
      focusArea = focusReport.focus;
      
      // Override the session ID reference
      createDto.futuregraphSessionId = focusReport.sessionId;
    } else {
      // Creating from session (existing logic)
      sourceType = 'session';
      const sessionData = await this.futuregraphService.getAnalysisSession(
        createDto.futuregraphSessionId!,
        false,
      );

      if (sessionData.session.userId !== userId) {
        throw new AuthorizationError('You can only create treatment plans for your own sessions');
      }

      session = sessionData.session;
      analysis = sessionData.analysis;
      report = sessionData.report;
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
      focusArea, // Pass focus area to AI service
    });

    // Create the treatment plan document
    const treatmentPlan = new this.treatmentPlanModel({
      planId,
      futuregraphSessionId: createDto.futuregraphSessionId,
      focusReportId,
      sourceType,
      focusArea,
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
      throw new ResourceNotFoundError('Treatment plan', planId);
    }

    if (plan.userId !== userId) {
      throw new AuthorizationError('You can only view your own treatment plans');
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
      throw new ResourceNotFoundError('Treatment plan', planId);
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
      throw new ResourceNotFoundError('Treatment plan', planId);
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