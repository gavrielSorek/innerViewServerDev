// src/futuregraph/futuregraph.service.ts
import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import {
  FuturegraphSession,
  FuturegraphSessionDocument,
} from './schemas/futuregraph-session.schema';
import {
  FuturegraphImage,
  FuturegraphImageDocument,
} from './schemas/futuregraph-image.schema';
import {
  FuturegraphFocusReport,
  FuturegraphFocusReportDocument,
} from './schemas/futuregraph-focus-report.schema';
import { AiService } from './ai.service';
import { StartSessionDto } from './dto/start-session.dto';
import { LanguageService, SupportedLanguage } from '../common/language.service';
import { 
  FuturegraphAnalysis, 
  FuturegraphReport,
  CoreIdentity,
  PersonalityLayers,
  DefenseMechanisms,
  InternalContracts,
  Capabilities,
  LimitingBeliefs,
  EmotionalPatterns,
  TherapeuticContract,
  ClientContext
} from '../common/types';
import { ResourceNotFoundError, ExternalServiceError } from '../common/errors/custom-errors';

@Injectable()
export class FuturegraphService {
  constructor(
    @InjectModel(FuturegraphSession.name)
    private readonly sessionModel: Model<FuturegraphSessionDocument>,
    @InjectModel(FuturegraphImage.name)
    private readonly imageModel: Model<FuturegraphImageDocument>,
    @InjectModel(FuturegraphFocusReport.name)
    private readonly focusReportModel: Model<FuturegraphFocusReportDocument>,
    private readonly aiService: AiService,
    private readonly languageService: LanguageService,
  ) {}

  /**
   * Create and process a complete FutureGraph analysis in a single operation.
   * The analysis is performed immediately and the result is stored in the database.
   * The handwriting image is persisted separately in the FuturegraphImage collection.
   */
  async startAndCompleteAnalysis(dto: StartSessionDto): Promise<{
    sessionId: string;
    analysis: FuturegraphAnalysis;
    report: FuturegraphReport;
  }> {
    const sessionId = `fg_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const language: SupportedLanguage = this.languageService.validate(dto.language);
    // Generate default name
    const sessionName: string = this.generateSessionName(dto.clientContext, language);

    // Persist the session without the handwriting image
    const session = new this.sessionModel({
      sessionId,
      name: sessionName,
      userId: dto.userId,
      clientId: dto.clientId,
      clientContext: dto.clientContext,
      startTime: new Date(),
      language,
      status: 'processing',
    });

    try {
      // Save the handwriting image in its own collection
      const imageDoc = new this.imageModel({
        sessionId,
        image: dto.handwritingImage,
      });
      await imageDoc.save();

      // Perform complete analysis in a single round
      const analysis: FuturegraphAnalysis = await this.aiService.analyzeComplete(
        dto.handwritingImage,
        session.clientContext || {} as ClientContext,
        {},
        language,
      );

      // Store analysis results
      session.completeAnalysis = analysis;
      session.completedAt = new Date();
      session.status = 'completed';

      // Generate report immediately
      const report: FuturegraphReport = this.generateReport(analysis, session, language);
      session.report = report;

      await session.save();

      return {
        sessionId,
        analysis,
        report,
      };
    } catch (error) {
      session.status = 'failed';
      session.error = error instanceof Error ? error.message : String(error);
      await session.save();
      if (error instanceof Error) {
        throw new ExternalServiceError('FutureGraph Analysis', error);
      }
      throw error;
    }
  }

  /**
   * Retrieve a completed analysis session with its results.
   * When includeImage is true the handwriting image is retrieved from the
   * FuturegraphImage collection and included in the response. Otherwise
   * handwritingImage will be undefined.
   */
  async getAnalysisSession(
    sessionId: string,
    includeImage = false,
  ): Promise<{
    session: FuturegraphSessionDocument;
    analysis: FuturegraphAnalysis;
    report: FuturegraphReport;
    handwritingImage?: string;
  }> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new ResourceNotFoundError('Session', sessionId);
    }

    let handwritingImage: string | undefined;
    if (includeImage) {
      const imageDoc = await this.imageModel.findOne({ sessionId }).exec();
      handwritingImage = imageDoc?.image;
    }

    return {
      session,
      analysis: session.completeAnalysis as FuturegraphAnalysis,
      report: session.report as FuturegraphReport,
      handwritingImage,
    };
  }

  /**
   * Get all analysis sessions for a specific client
   */
  async getClientAnalyses(
    clientId: string,
    userId: string,
  ): Promise<
    {
      sessionId: string;
      name: string;
      createdAt: Date;
      status: string;
      language: string;
    }[]
  > {
    const sessions = await this.sessionModel
      .find({ clientId, userId })
      .select('sessionId name startTime status language')
      .sort('-startTime')
      .exec();

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      name: s.name,
      createdAt: s.startTime,
      status: s.status,
      language: s.language,
    }));
  }

  /**
   * Create or retrieve a focused analysis report
   */
  async createFocusedAnalysis(
    sessionId: string,
    focus: string,
    language: string,
    userId: string,
  ): Promise<{
    focusReportId: string;
    analysis: FuturegraphAnalysis;
    report: FuturegraphReport;
  }> {
    // Check if we already have this focus report
    const existingReport = await this.focusReportModel.findOne({
      sessionId,
      focus,
      language,
    }).exec();

    if (existingReport) {
      return {
        focusReportId: existingReport.focusReportId,
        analysis: existingReport.focusedAnalysis as FuturegraphAnalysis,
        report: existingReport.focusedReport as FuturegraphReport,
      };
    }

    // Get the original session
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session || !session.completeAnalysis) {
      throw new ResourceNotFoundError('Session', sessionId);
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      throw new ResourceNotFoundError('Session', sessionId);
    }

    // Generate focus report ID
    const focusReportId = `fg_focus_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    // Generate default name
    const focusReportName = this.generateFocusReportName(focus, language);

    try {
      // Generate focused analysis using AI
      const focusedAnalysis: FuturegraphAnalysis = await this.aiService.getFocusedAnalysis(
        session.completeAnalysis as FuturegraphAnalysis,
        focus,
        language,
      );

      // Generate focused report
      const focusedReport: FuturegraphReport = this.generateReport(
        focusedAnalysis,
        session,
        language as SupportedLanguage,
      );

      // Save the focus report
      const focusReportDoc = new this.focusReportModel({
        focusReportId,
        name: focusReportName,
        sessionId,
        userId,
        clientId: session.clientId,
        focus,
        language,
        focusedAnalysis,
        focusedReport,
        status: 'completed',
      });

      await focusReportDoc.save();

      return {
        focusReportId,
        analysis: focusedAnalysis,
        report: focusedReport,
      };
    } catch (error) {
      // Save failed attempt
      const focusReportDoc = new this.focusReportModel({
        focusReportId,
        sessionId,
        userId,
        clientId: session.clientId,
        focus,
        language,
        focusedAnalysis: {},
        focusedReport: {},
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      });

      await focusReportDoc.save();
      throw error;
    }
  }

  /**
   * Get all focus reports for a user
   */
  async getUserFocusReports(
    userId: string,
    limit = 20,
  ): Promise<Array<{
    focusReportId: string;
    sessionId: string;
    clientId: string;
    name: string;
    focus: string;
    language: string;
    createdAt: Date;
    status: string;
  }>> {
    const reports = await this.focusReportModel
      .find({ userId })
      .select('focusReportId sessionId clientId name focus language createdAt status')
      .sort('-createdAt')
      .limit(limit)
      .exec();

    return reports.map(r => {
      const doc = r as FuturegraphFocusReportDocument;
      return {
        focusReportId: doc.focusReportId,
        sessionId: doc.sessionId,
        clientId: doc.clientId,
        name: doc.name,
        focus: doc.focus,
        language: doc.language,
        createdAt: doc.createdAt,
        status: doc.status,
      };
    });
  }

  /**
   * Get focus reports for a specific session
   */
   async getSessionFocusReports(
    sessionId: string,
    userId: string,
  ): Promise<Array<{
    focusReportId: string;
    name: string;
    focus: string;
    language: string;
    createdAt: Date;
  }>> {
    const reports = await this.focusReportModel
      .find({ sessionId, userId })
      .select('focusReportId name focus language createdAt')
      .sort('-createdAt')
      .exec();

    return reports.map(r => {
      const doc = r as FuturegraphFocusReportDocument;
      return {
        focusReportId: doc.focusReportId,
        name: doc.name,
        focus: doc.focus,
        language: doc.language,
        createdAt: doc.createdAt,
      };
    });
  }

  /**
   * Get a specific focus report by ID
   */
  async getFocusReportById(
    focusReportId: string,
    userId: string,
  ): Promise<{
    focusReportId: string;
    sessionId: string;
    clientId: string;
    focus: string;
    language: string;
    status: string;
    analysis: FuturegraphAnalysis;
    report: FuturegraphReport;
    createdAt: Date;
  }> {
    const focusReport = await this.focusReportModel.findOne({
      focusReportId,
      userId,
    }).exec();

    if (!focusReport) {
      throw new ResourceNotFoundError('Focus report', focusReportId);
    }

    const doc = focusReport as FuturegraphFocusReportDocument;

    return {
      focusReportId: doc.focusReportId,
      sessionId: doc.sessionId,
      clientId: doc.clientId,
      focus: doc.focus,
      language: doc.language,
      status: doc.status,
      analysis: doc.focusedAnalysis as FuturegraphAnalysis,
      report: doc.focusedReport as FuturegraphReport,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Generate a comprehensive report from the complete analysis
   */
  private generateReport(
    analysis: FuturegraphAnalysis,
    session: FuturegraphSessionDocument,
    language: SupportedLanguage,
  ): FuturegraphReport {
    return {
      sessionId: session.sessionId,
      clientId: session.clientId,
      generatedAt: new Date(),
      language,
      executiveSummary: this.generateExecutiveSummary(analysis, language),
      coreIdentity: analysis.coreIdentity || {} as CoreIdentity,
      personalityLayers: analysis.personalityLayers || {} as PersonalityLayers,
      emotionalPatterns: analysis.emotionalPatterns || {} as EmotionalPatterns,
      defenceMechanisms: analysis.defenceMechanisms || {} as DefenseMechanisms,
      
      // Internal Contracts - חוזים פנימיים
      internalContracts: this.formatInternalContracts(analysis.internalContracts, language),
      
      // Intellectual-Emotional-Social Capabilities - יכולות שכליות-רגשיות-חברתיות
      capabilities: this.formatCapabilities(analysis.intellectualEmotionalSocialCapabilities, language),
      
      limitingBeliefs: analysis.limitingBeliefs || {} as LimitingBeliefs,
      therapeuticInsights: analysis.therapeuticInsights || [],
      treatmentRecommendations: analysis.treatmentRecommendations || [],
      therapeuticContract: this.generateTherapeuticContract(
        analysis,
        language,
      ),
    };
  }

  /**
   * Format internal contracts for the report
   */
  private formatInternalContracts(contracts: InternalContracts | undefined, language: SupportedLanguage): {
    title: string;
    contracts: InternalContracts['contracts'];
    overallImpact: string;
  } {
    if (!contracts) {
      return {
        title: language === 'he' ? 'חוזים פנימיים' : 'Internal Contracts',
        contracts: [],
        overallImpact: language === 'he' 
          ? 'לא זוהו חוזים פנימיים משמעותיים' 
          : 'No significant internal contracts identified',
      };
    }

    return {
      title: language === 'he' ? 'חוזים פנימיים' : 'Internal Contracts',
      contracts: contracts.contracts || [],
      overallImpact: contracts.overallImpact || '',
    };
  }

  /**
   * Format intellectual-emotional-social capabilities for the report
   */
  private formatCapabilities(capabilities: Capabilities | undefined, language: SupportedLanguage): {
    title: string;
    intellectual: Capabilities['intellectual'];
    emotional: Capabilities['emotional'];
    social: Capabilities['social'];
    summary: string;
  } {
    if (!capabilities) {
      return {
        title: language === 'he' 
          ? 'יכולות שכליות-רגשיות-חברתיות' 
          : 'Intellectual-Emotional-Social Capabilities',
        intellectual: { capabilities: [], strengths: [] },
        emotional: { capabilities: [], strengths: [] },
        social: { capabilities: [], strengths: [] },
        summary: language === 'he' 
          ? 'נדרש ניתוח נוסף לזיהוי יכולות' 
          : 'Further analysis needed to identify capabilities',
      };
    }

    return {
      title: language === 'he' 
        ? 'יכולות שכליות-רגשיות-חברתיות' 
        : 'Intellectual-Emotional-Social Capabilities',
      intellectual: capabilities.intellectual || { capabilities: [], strengths: [] },
      emotional: capabilities.emotional || { capabilities: [], strengths: [] },
      social: capabilities.social || { capabilities: [], strengths: [] },
      summary: capabilities.summary || '',
    };
  }

  /**
   * Generate executive summary in the requested language
   */
  private generateExecutiveSummary(
    analysis: FuturegraphAnalysis,
    language: SupportedLanguage,
  ): string {
    const intro =
      language === 'he'
        ? 'בהתבסס על ניתוח מקיף של כתב היד בשיטת FutureGraph™, '
        : 'Based on comprehensive FutureGraph™ handwriting analysis, ';

    const coreIdentity =
      analysis.coreIdentity?.name ||
      (language === 'he' ? 'זהות מורכבת' : 'complex identity');

    const mainInsight =
      analysis.therapeuticInsights?.[0] ||
      (language === 'he' ? 'דפוסים רגשיים עמוקים' : 'deep emotional patterns');

    // Include contracts and capabilities summary
    const contractsSummary = analysis.internalContracts?.contracts?.length > 0
      ? language === 'he' 
        ? ` עם ${analysis.internalContracts.contracts.length} חוזים פנימיים מרכזיים`
        : ` with ${analysis.internalContracts.contracts.length} primary internal contracts`
      : '';

    const capabilitiesSummary = analysis.intellectualEmotionalSocialCapabilities?.summary
      ? language === 'he'
        ? ` ויכולות בולטות בתחומים שונים`
        : ` and notable capabilities across multiple domains`
      : '';

    return `${intro}${coreIdentity}. ${mainInsight}${contractsSummary}${capabilitiesSummary}.`;
  }

  /**
   * Generate therapeutic contract structure
   */
  private generateTherapeuticContract(
    analysis: FuturegraphAnalysis,
    language: SupportedLanguage,
  ): TherapeuticContract {
    // Include focus on internal contracts if identified
    const contractFocus = analysis.internalContracts?.contracts?.length > 0
      ? language === 'he'
        ? ['עבודה על חוזים פנימיים וטרנספורמציה שלהם']
        : ['Working on internal contracts and their transformation']
      : [];

    // Include capability development if relevant
    const capabilityFocus = analysis.intellectualEmotionalSocialCapabilities
      ? language === 'he'
        ? ['פיתוח וחיזוק יכולות אישיות']
        : ['Development and strengthening of personal capabilities']
      : [];

    return {
      goals: [
        ...(analysis.therapeuticGoals || [
          language === 'he'
            ? 'להיקבע בשיתוף עם המטופל'
            : 'To be determined in collaboration with client',
        ]),
        ...contractFocus,
        ...capabilityFocus,
      ],
      approach:
        analysis.recommendedApproach ||
        (language === 'he'
          ? 'גישה אינטגרטיבית המבוססת על ממצאי FutureGraph™'
          : 'Integrative approach based on FutureGraph™ findings'),
      timeline:
        analysis.suggestedTimeline ||
        (language === 'he'
          ? 'מומלצות 12-16 מפגשים'
          : 'Recommended 12-16 sessions'),
      focusAreas: [
        ...(analysis.focusAreas || []),
        ...contractFocus,
        ...capabilityFocus,
      ],
    };
  }

  /**
   * Legacy method for backward compatibility - redirects to createFocusedAnalysis
   */
  async getFocusedAnalysis(
    sessionId: string,
    focus: string,
    language: string,
  ): Promise<FuturegraphAnalysis> {
    // This method is deprecated in favor of createFocusedAnalysis
    // but kept for backward compatibility
    const session = await this.sessionModel.findOne({ sessionId }).exec();

    if (!session || !session.completeAnalysis) {
      throw new ResourceNotFoundError('Session', sessionId);
    }

    // Use the completeAnalysis field as the full analysis JSON
    const analysisJson = session.completeAnalysis;

    // Use aiService for focused analysis
    const focusedReport = await this.aiService.getFocusedAnalysis(
      analysisJson as FuturegraphAnalysis,
      focus,
      language,
    );

    return focusedReport;
  }

  /**
   * Delete a single analysis session with its image
   * @param sessionId The session to delete
   * @param userId The user who owns the session
   * @returns Result of deletion operation
   */
  async deleteSession(
    sessionId: string,
    userId: string,
  ): Promise<{
    sessionDeleted: boolean;
    imageDeleted: boolean;
    error?: string;
  }> {
    try {
      // Verify ownership and delete session
      const sessionResult = await this.sessionModel.deleteOne({
        sessionId,
        userId,
      }).exec();

      if (sessionResult.deletedCount === 0) {
        return {
          sessionDeleted: false,
          imageDeleted: false,
          error: 'Session not found or access denied',
        };
      }

      // Delete associated image
      const imageResult = await this.imageModel.deleteOne({
        sessionId,
      }).exec();

      return {
        sessionDeleted: true,
        imageDeleted: imageResult.deletedCount > 0,
      };
    } catch (error) {
      console.error('Error deleting session:', error);
      return {
        sessionDeleted: false,
        imageDeleted: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete a single focus report
   * @param focusReportId The focus report to delete
   * @param userId The user who owns the report
   * @returns Result of deletion operation
   */
  async deleteFocusReport(
    focusReportId: string,
    userId: string,
  ): Promise<{
    deleted: boolean;
    error?: string;
  }> {
    try {
      const result = await this.focusReportModel.deleteOne({
        focusReportId,
        userId,
      }).exec();

      if (result.deletedCount === 0) {
        return {
          deleted: false,
          error: 'Focus report not found or access denied',
        };
      }

      return {
        deleted: true,
      };
    } catch (error) {
      console.error('Error deleting focus report:', error);
      return {
        deleted: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Delete all sessions and focus reports for a specific client
   * @param clientId The client whose sessions to delete
   * @param userId The user who owns the sessions
   * @returns Detailed results of deletion operations
   */
  async deleteClientSessions(
    clientId: string,
    userId: string,
  ): Promise<{
    sessionsDeleted: number;
    imagesDeleted: number;
    focusReportsDeleted: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Get all sessions for this client
      const sessions = await this.sessionModel
        .find({ clientId, userId })
        .select('sessionId')
        .exec();

      const sessionIds = sessions.map(s => s.sessionId);

      if (sessionIds.length === 0) {
        return {
          sessionsDeleted: 0,
          imagesDeleted: 0,
          focusReportsDeleted: 0,
          errors: ['No sessions found for this client'],
        };
      }

      // Delete all sessions
      const sessionResult = await this.sessionModel.deleteMany({
        clientId,
        userId,
      }).exec();

      // Delete all associated images
      const imageResult = await this.imageModel.deleteMany({
        sessionId: { $in: sessionIds },
      }).exec();

      // Delete all focus reports for these sessions
      const focusResult = await this.focusReportModel.deleteMany({
        sessionId: { $in: sessionIds },
        userId,
      }).exec();

      return {
        sessionsDeleted: sessionResult.deletedCount || 0,
        imagesDeleted: imageResult.deletedCount || 0,
        focusReportsDeleted: focusResult.deletedCount || 0,
        errors,
      };
    } catch (error) {
      console.error('Error deleting client sessions:', error);
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        sessionsDeleted: 0,
        imagesDeleted: 0,
        focusReportsDeleted: 0,
        errors,
      };
    }
  }

  /**
   * Delete all sessions and focus reports for a user
   * @param userId The user whose all sessions to delete
   * @returns Detailed results of deletion operations
   */
  async deleteAllUserSessions(
    userId: string,
  ): Promise<{
    sessionsDeleted: number;
    imagesDeleted: number;
    focusReportsDeleted: number;
    errors: string[];
  }> {
    const errors: string[] = [];

    try {
      // Get all sessions for this user
      const sessions = await this.sessionModel
        .find({ userId })
        .select('sessionId')
        .exec();

      const sessionIds = sessions.map(s => s.sessionId);

      if (sessionIds.length === 0) {
        return {
          sessionsDeleted: 0,
          imagesDeleted: 0,
          focusReportsDeleted: 0,
          errors: ['No sessions found for this user'],
        };
      }

      // Delete all sessions
      const sessionResult = await this.sessionModel.deleteMany({
        userId,
      }).exec();

      // Delete all associated images
      const imageResult = await this.imageModel.deleteMany({
        sessionId: { $in: sessionIds },
      }).exec();

      // Delete all focus reports
      const focusResult = await this.focusReportModel.deleteMany({
        userId,
      }).exec();

      return {
        sessionsDeleted: sessionResult.deletedCount || 0,
        imagesDeleted: imageResult.deletedCount || 0,
        focusReportsDeleted: focusResult.deletedCount || 0,
        errors,
      };
    } catch (error) {
      console.error('Error deleting all user sessions:', error);
      errors.push(error instanceof Error ? error.message : String(error));
      return {
        sessionsDeleted: 0,
        imagesDeleted: 0,
        focusReportsDeleted: 0,
        errors,
      };
    }
  }

  /**
   * Get count of sessions and reports for a client (useful before deletion)
   * @param clientId The client ID
   * @param userId The user ID
   * @returns Count of sessions and reports
   */
  async getClientSessionCounts(
    clientId: string,
    userId: string,
  ): Promise<{
    sessions: number;
    focusReports: number;
  }> {
    const sessions = await this.sessionModel.countDocuments({
      clientId,
      userId,
    }).exec();

    const sessionIds = await this.sessionModel
      .find({ clientId, userId })
      .select('sessionId')
      .exec()
      .then(docs => docs.map(d => d.sessionId));

    const focusReports = sessionIds.length > 0
      ? await this.focusReportModel.countDocuments({
          sessionId: { $in: sessionIds },
          userId,
        }).exec()
      : 0;

    return {
      sessions,
      focusReports,
    };
  }

  /**
   * Get count of all sessions and reports for a user (useful before deletion)
   * @param userId The user ID
   * @returns Count of sessions and reports
   */
  async getUserSessionCounts(
    userId: string,
  ): Promise<{
    sessions: number;
    focusReports: number;
    clients: number;
  }> {
    const sessions = await this.sessionModel.countDocuments({
      userId,
    }).exec();

    const focusReports = await this.focusReportModel.countDocuments({
      userId,
    }).exec();

    // Get unique client count
    const clients = await this.sessionModel
      .distinct('clientId', { userId })
      .exec()
      .then(ids => ids.length);

    return {
      sessions,
      focusReports,
      clients,
    };
  }

  /**
   * Generate default name for a session
   */
  private generateSessionName(clientContext: any, language: SupportedLanguage): string {
    const clientName = clientContext?.name || (language === 'he' ? 'לקוח' : 'Client');
    const date = new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US');
    return `${clientName} - ${date}`;
  }

  /**
   * Generate default name for a focus report
   */
  private generateFocusReportName(focus: string, language: string): string {
    const date = new Date().toLocaleDateString(language === 'he' ? 'he-IL' : 'en-US');
    return `Focus: ${focus} - ${date}`;
  }

  /**
   * Update session name
   */
  async updateSessionName(
    sessionId: string,
    userId: string,
    name: string,
  ): Promise<{ success: boolean; name?: string; error?: string }> {
    try {
      const result = await this.sessionModel.updateOne(
        { sessionId, userId },
        { name },
      ).exec();

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: 'Session not found or access denied',
        };
      }

      return {
        success: true,
        name,
      };
    } catch (error) {
      console.error('Error updating session name:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Update focus report name
   */
  async updateFocusReportName(
    focusReportId: string,
    userId: string,
    name: string,
  ): Promise<{ success: boolean; name?: string; error?: string }> {
    try {
      const result = await this.focusReportModel.updateOne(
        { focusReportId, userId },
        { name },
      ).exec();

      if (result.matchedCount === 0) {
        return {
          success: false,
          error: 'Focus report not found or access denied',
        };
      }

      return {
        success: true,
        name,
      };
    } catch (error) {
      console.error('Error updating focus report name:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }
}