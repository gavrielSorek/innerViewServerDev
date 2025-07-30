// FutureGraph service modifications. This version separates image storage
// from session documents by persisting handwriting images in the
// FuturegraphImage collection. It also adds support for optionally
// retrieving the image when fetching a session via an includeImage flag.

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

    // Persist the session without the handwriting image. The image will be stored
    // separately to avoid bloating the session document.
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

    return `${intro}${coreIdentity}. ${mainInsight}`;
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
    return {
      goals: analysis.therapeuticGoals || [
        language === 'he'
          ? 'להיקבע בשיתוף עם המטופל'
          : 'To be determined in collaboration with client',
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
      focusAreas: analysis.focusAreas || [],
    };
  }
}