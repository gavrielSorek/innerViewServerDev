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
    analysis: any;
    report: any;
  }> {
    const sessionId = `fg_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const language: SupportedLanguage = this.languageService.validate(dto.language);

    // Persist the session without the handwriting image
    const session = new this.sessionModel({
      sessionId,
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
      const analysis = await this.aiService.analyzeComplete(
        dto.handwritingImage,
        session.clientContext,
        {},
        language,
      );

      // Store analysis results
      session.completeAnalysis = analysis;
      session.completedAt = new Date();
      session.status = 'completed';

      // Generate report immediately
      const report = this.generateReport(analysis, session, language);
      session.report = report;

      await session.save();

      return {
        sessionId,
        analysis,
        report,
      };
    } catch (error) {
      session.status = 'failed';
      session.error = error.message;
      await session.save();
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
    analysis: any;
    report: any;
    handwritingImage?: string;
  }> {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    let handwritingImage: string | undefined;
    if (includeImage) {
      const imageDoc = await this.imageModel.findOne({ sessionId }).exec();
      handwritingImage = imageDoc?.image;
    }

    return {
      session,
      analysis: session.completeAnalysis,
      report: session.report,
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
      createdAt: Date;
      status: string;
      language: string;
    }[]
  > {
    const sessions = await this.sessionModel
      .find({ clientId, userId })
      .select('sessionId startTime status language')
      .sort('-startTime')
      .exec();

    return sessions.map((s) => ({
      sessionId: s.sessionId,
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
    analysis: any;
    report: any;
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
        analysis: existingReport.focusedAnalysis,
        report: existingReport.focusedReport,
      };
    }

    // Get the original session
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    if (!session || !session.completeAnalysis) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found or has no analysis.`);
    }

    // Verify user owns this session
    if (session.userId !== userId) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found.`);
    }

    // Generate focus report ID
    const focusReportId = `fg_focus_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      // Generate focused analysis using AI
      const focusedAnalysis = await this.aiService.getFocusedAnalysis(
        session.completeAnalysis,
        focus,
        language,
      );

      // Generate focused report
      const focusedReport = this.generateReport(
        focusedAnalysis,
        session,
        language as SupportedLanguage,
      );

      // Save the focus report
      const focusReport = new this.focusReportModel({
        focusReportId,
        sessionId,
        userId,
        clientId: session.clientId,
        focus,
        language,
        focusedAnalysis,
        focusedReport,
        status: 'completed',
      });

      await focusReport.save();

      return {
        focusReportId,
        analysis: focusedAnalysis,
        report: focusedReport,
      };
    } catch (error) {
      // Save failed attempt
      const focusReport = new this.focusReportModel({
        focusReportId,
        sessionId,
        userId,
        clientId: session.clientId,
        focus,
        language,
        focusedAnalysis: {},
        focusedReport: {},
        status: 'failed',
        error: error.message,
      });

      await focusReport.save();
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
    focus: string;
    language: string;
    createdAt: Date;
    status: string;
  }>> {
    const reports = await this.focusReportModel
      .find({ userId })
      .select('focusReportId sessionId clientId focus language createdAt status')
      .sort('-createdAt')
      .limit(limit)
      .exec();

    return reports.map(r => {
      const doc = r as FuturegraphFocusReportDocument;
      return {
        focusReportId: doc.focusReportId,
        sessionId: doc.sessionId,
        clientId: doc.clientId,
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
    focus: string;
    language: string;
    createdAt: Date;
  }>> {
    const reports = await this.focusReportModel
      .find({ sessionId, userId })
      .select('focusReportId focus language createdAt')
      .sort('-createdAt')
      .exec();

    return reports.map(r => {
      const doc = r as FuturegraphFocusReportDocument;
      return {
        focusReportId: doc.focusReportId,
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
    analysis: any;
    report: any;
    createdAt: Date;
  }> {
    const focusReport = await this.focusReportModel.findOne({
      focusReportId,
      userId,
    }).exec();

    if (!focusReport) {
      throw new NotFoundException('Focus report not found');
    }

    const doc = focusReport as FuturegraphFocusReportDocument;

    return {
      focusReportId: doc.focusReportId,
      sessionId: doc.sessionId,
      clientId: doc.clientId,
      focus: doc.focus,
      language: doc.language,
      status: doc.status,
      analysis: doc.focusedAnalysis,
      report: doc.focusedReport,
      createdAt: doc.createdAt,
    };
  }

  /**
   * Generate a comprehensive report from the complete analysis
   */
  private generateReport(
    analysis: any,
    session: FuturegraphSessionDocument,
    language: SupportedLanguage,
  ): any {
    return {
      sessionId: session.sessionId,
      clientId: session.clientId,
      generatedAt: new Date(),
      language,
      executiveSummary: this.generateExecutiveSummary(analysis, language),
      coreIdentity: analysis.coreIdentity || {},
      personalityLayers: analysis.personalityLayers || {},
      emotionalPatterns: analysis.emotionalPatterns || {},
      defenceMechanisms: analysis.defenceMechanisms || {},
      
      // Internal Contracts - חוזים פנימיים
      internalContracts: this.formatInternalContracts(analysis.internalContracts, language),
      
      // Intellectual-Emotional-Social Capabilities - יכולות שכליות-רגשיות-חברתיות
      capabilities: this.formatCapabilities(analysis.intellectualEmotionalSocialCapabilities, language),
      
      limitingBeliefs: analysis.limitingBeliefs || {},
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
  private formatInternalContracts(contracts: any, language: SupportedLanguage): any {
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
  private formatCapabilities(capabilities: any, language: SupportedLanguage): any {
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
    analysis: any,
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
    analysis: any,
    language: SupportedLanguage,
  ): {
    goals: string[];
    approach: string;
    timeline: string;
    focusAreas: string[];
  } {
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
  ): Promise<any> {
    // This method is deprecated in favor of createFocusedAnalysis
    // but kept for backward compatibility
    const session = await this.sessionModel.findOne({ sessionId }).exec();

    if (!session || !session.completeAnalysis) {
      throw new NotFoundException(`Session with ID "${sessionId}" not found or has no analysis.`);
    }

    // Use the completeAnalysis field as the full analysis JSON
    const analysisJson = session.completeAnalysis;

    // Use aiService for focused analysis
    const focusedReport = await this.aiService.getFocusedAnalysis(
      analysisJson,
      focus,
      language,
    );

    return focusedReport;
  }
}