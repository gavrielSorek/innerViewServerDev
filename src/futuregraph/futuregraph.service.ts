// Service implementing the FutureGraph analysis workflow.  Handles
// session creation, round processing, validation against the FutureGraph
// laws, and final report generation.
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
import { AiService } from './ai.service';
import { StartSessionDto } from './dto/start-session.dto';
import { ProcessRoundDto } from './dto/process-round.dto';
import { SubmitFeedbackDto } from './dto/submit-feedback.dto';
import { FuturegraphLaws } from './constants/futuregraph-laws';
import { RoundDefinitions } from './constants/round-definitions';

@Injectable()
export class FuturegraphService {
  constructor(
    @InjectModel(FuturegraphSession.name)
    private readonly sessionModel: Model<FuturegraphSessionDocument>,
    private readonly aiService: AiService,
  ) {}

  /**
   * Create a new analysis session in the database.  Generates a unique
   * identifier and persists the session record.
   */
  async startSession(dto: StartSessionDto): Promise<string> {
    const sessionId = `fg_${Date.now()}_${Math.random()
      .toString(36)
      .substr(2, 9)}`;
    const session = new this.sessionModel({
      sessionId,
      userId: dto.userId,
      clientId: dto.clientId,
      handwritingImage: dto.handwritingImage,
      clientContext: dto.clientContext,
      startTime: new Date(),
      rounds: [],
      currentRound: 0,
      status: 'active',
    });
    await session.save();
    return sessionId;
  }

  /**
   * Process a single analysis round.  This enforces round ordering,
   * invokes the AI analysis, validates the result against the laws, and
   * stores the resulting round on the session.
   */
  async processRound(
    dto: ProcessRoundDto,
  ): Promise<{
    roundNumber: number;
    analysis: any;
    validation: {
      passed: boolean;
      violations: string[];
      warnings: string[];
    };
    requiresApproval: boolean;
  }> {
    const session = await this.sessionModel
      .findOne({ sessionId: dto.sessionId })
      .exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate according to FutureGraph laws
    this.validateRoundProgression(session, dto.roundNumber);

    // Invoke the AI analysis for this round
    const analysis = await this.aiService.analyzeRound(
      dto.roundNumber,
      session.handwritingImage,
      session.clientContext,
      dto.additionalContext,
      session.rounds,
    );

    // Apply QA validation against the FutureGraph laws
    const validation = this.validateAnalysis(analysis, session);
    analysis.qaValidation = validation;

    // Persist the round
    const roundData = {
      roundNumber: dto.roundNumber,
      timestamp: new Date(),
      analysis,
      additionalContext: dto.additionalContext,
      therapistApproved: false,
    };
    session.rounds.push(roundData as any);
    session.currentRound = dto.roundNumber;
    await session.save();

    return {
      roundNumber: dto.roundNumber,
      analysis,
      validation,
      requiresApproval: true,
    };
  }

  /**
   * Return the current status of the session including completed rounds
   * and whether the analysis is finished.
   */
  async getSessionStatus(sessionId: string): Promise<{
    sessionId: string;
    status: string;
    currentRound: number;
    completedRounds: number;
    totalRounds: number;
    isComplete: boolean;
    rounds: Array<{
      number: number;
      completed: boolean;
      timestamp: Date;
    }>;
  }> {
    const session = await this.sessionModel
      .findOne({ sessionId })
      .exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const completedRounds = session.rounds.filter(
      (r) => r.therapistApproved,
    ).length;
    const isComplete = completedRounds === 10;
    return {
      sessionId: session.sessionId,
      status: session.status,
      currentRound: session.currentRound,
      completedRounds,
      totalRounds: 10,
      isComplete,
      rounds: session.rounds.map((r) => ({
        number: r.roundNumber,
        completed: r.therapistApproved,
        timestamp: r.timestamp,
      })),
    };
  }

  /**
   * Generate a final analysis report once all rounds have been completed
   * and approved.  Throws an error if the session is incomplete.
   */
  async generateReport(sessionId: string): Promise<any> {
    const session = await this.sessionModel
      .findOne({ sessionId })
      .exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const completedRounds = session.rounds.filter(
      (r) => r.therapistApproved,
    ).length;
    if (completedRounds < 10) {
      throw new BadRequestException(
        `All rounds must be completed before generating report. Completed: ${completedRounds}/10`,
      );
    }
    return {
      sessionId: session.sessionId,
      clientId: session.clientId,
      generatedAt: new Date(),
      executiveSummary: this.generateExecutiveSummary(session),
      detailedFindings: this.generateDetailedFindings(session),
      treatmentRecommendations:
        this.generateTreatmentRecommendations(session),
      therapeuticContract: this.generateTherapeuticContract(session),
      identityEvolution: this.trackIdentityEvolution(session),
      voiceMaskAnalysis: this.analyzeVoicesAndMasks(session),
    };
  }

  /**
   * Record therapist feedback for a given round.  Marks the round as
   * approved or rejected and sets flags for reprocessing if needed.
   */
  async submitFeedback(
    dto: SubmitFeedbackDto,
  ): Promise<{ success: boolean; message: string }> {
    const session = await this.sessionModel
      .findOne({ sessionId: dto.sessionId })
      .exec();
    if (!session) {
      throw new NotFoundException('Session not found');
    }
    const roundIndex = session.rounds.findIndex(
      (r) => r.roundNumber === dto.roundNumber,
    );
    if (roundIndex === -1) {
      throw new NotFoundException('Round not found');
    }
    const round = session.rounds[roundIndex] as any;
    round.therapistFeedback = dto.feedback;
    round.therapistApproved = dto.approved;
    round.approvalTimestamp = new Date();
    if (!dto.approved) {
      round.requiresReprocessing = true;
    }
    await session.save();
    return {
      success: true,
      message: dto.approved
        ? 'Round approved'
        : 'Round marked for reprocessing',
    };
  }

  /**
   * Enforce ordering and dependency constraints between rounds.  Throws
   * descriptive exceptions if the therapist attempts to skip ahead.
   */
  private validateRoundProgression(
    session: FuturegraphSessionDocument,
    roundNumber: number,
  ): void {
    // Inter-Round Pause Law: ensure previous rounds exist
    if (roundNumber > 1 && session.rounds.length < roundNumber - 1) {
      throw new BadRequestException(
        'Previous rounds must be completed first (Inter-Round Pause Law)',
      );
    }
    // Sync Products Before Treatment Law: diagnostic rounds 1–6 must be
    // completed and QA approved before treatment rounds 7–10
    if (roundNumber >= 7 && roundNumber <= 10) {
      const diagnosticRoundsComplete =
        session.rounds.filter(
          (r) =>
            r.roundNumber >= 1 &&
            r.roundNumber <= 6 &&
            (r as any).qaValidation?.passed,
        ).length === 6;
      if (!diagnosticRoundsComplete) {
        throw new BadRequestException(
          'Diagnostic rounds 1-6 must be completed and QA approved before treatment rounds (Sync Products Before Treatment Law)',
        );
      }
    }
  }

  /**
   * Validate the AI output against the FutureGraph laws and return a
   * structured object containing pass/fail information along with any
   * violations or warnings.  This method does not mutate the session.
   */
  private validateAnalysis(
    analysis: any,
    session: FuturegraphSessionDocument,
  ): {
    passed: boolean;
    violations: string[];
    warnings: string[];
  } {
    const validationResults = {
      passed: true,
      violations: [] as string[],
      warnings: [] as string[],
    };
    // One-Layer Influence constraint
    if (analysis.retroactiveInfluences) {
      analysis.retroactiveInfluences.forEach((influence: any) => {
        const layerDiff = analysis.roundNumber - influence.targetRound;
        if (layerDiff > 1) {
          const hasException = FuturegraphLaws.oneLayerInfluence.exceptions.some(
            (exception) =>
              influence.validation?.includes(exception),
          );
          if (!hasException) {
            validationResults.passed = false;
            validationResults.violations.push(
              `One-Layer Influence violated: Round ${analysis.roundNumber} attempting to influence Round ${influence.targetRound}`,
            );
          }
        }
      });
    }
    // Sign Flexibility: require justification and therapeutic relevance
    if (analysis.graphologicalSigns) {
      analysis.graphologicalSigns.forEach(
        (sign: any, index: number) => {
          if (!sign.justification || !sign.therapeuticRelevance) {
            validationResults.warnings.push(
              `Sign ${index + 1} missing required justification or therapeutic relevance`,
            );
          }
        },
      );
    }
    // Voice ≠ Mask for rounds 7–8
    if (
      analysis.roundNumber === 7 ||
      analysis.roundNumber === 8
    ) {
      if (analysis.voices && analysis.masks) {
        const overlap = analysis.voices.filter((voice: any) =>
          analysis.masks.some((mask: any) => mask.id === voice.id),
        );
        if (overlap.length > 0) {
          validationResults.violations.push(
            `Voice ≠ Mask principle violated: Found ${overlap.length} overlapping identifications`,
          );
          validationResults.passed = false;
        }
      }
    }
    return validationResults;
  }

  /**
   * Build a high‑level summary capturing the key narrative arcs from
   * visible layer through to treatment recommendations.
   */
  private generateExecutiveSummary(session: FuturegraphSessionDocument): string {
    const visibleLayer = session.rounds.find(
      (r) => r.roundNumber === 1,
    )?.analysis;
    const rootLayer = session.rounds.find(
      (r) => r.roundNumber === 6,
    )?.analysis;
    const treatment = session.rounds.find(
      (r) => r.roundNumber === 10,
    )?.analysis;
    return `Based on comprehensive FutureGraph™ Pro+ analysis across 10 diagnostic rounds, \
the client presents with ${
      visibleLayer?.graphologicalSigns?.[0]?.interpretation || 'complex patterns'
    } at the visible layer, evolving to ${
      rootLayer?.identityAnchors?.[0] ||
      'deep-seated identity structures'
    } at the root level. Primary treatment recommendations include ${
      treatment?.therapeuticInsights?.[0] || 'targeted interventions'
    }.`;
  }

  /**
   * Produce a dictionary of findings keyed by round name.  Each entry
   * exposes the signs, emotional indicators, therapeutic insights and
   * retroactive influences for that round.
   */
  private generateDetailedFindings(session: FuturegraphSessionDocument): Record<string, any> {
    const findings: Record<string, any> = {};
    session.rounds.forEach((round: any) => {
      findings[
        `Round ${round.roundNumber}: ${RoundDefinitions[round.roundNumber].name}`
      ] = {
        graphologicalSigns: round.analysis.graphologicalSigns,
        emotionalIndicators: round.analysis.emotionalIndicators,
        therapeuticInsights: round.analysis.therapeuticInsights,
        retroactiveInfluences: round.analysis.retroactiveInfluences,
      };
    });
    return findings;
  }

  /**
   * Assemble an array of treatment recommendations based on the final
   * treatment round and optionally augment with voice and mask guidance.
   */
  private generateTreatmentRecommendations(
    session: FuturegraphSessionDocument,
  ): string[] {
    const treatmentRound = session.rounds.find(
      (r) => r.roundNumber === 10,
    );
    const recommendations =
      (treatmentRound?.analysis.therapeuticInsights as string[]) ||
      [];
    const voiceRound = session.rounds.find(
      (r) => r.roundNumber === 7,
    );
    const maskRound = session.rounds.find(
      (r) => r.roundNumber === 8,
    );
    if (voiceRound?.analysis.voices?.length > 0) {
      recommendations.push(
        'Voice dialogue work to integrate internal parts',
      );
    }
    if (maskRound?.analysis.masks?.length > 0) {
      recommendations.push(
        'Exploration of defense mechanisms and authentic self',
      );
    }
    return recommendations;
  }

  /**
   * Create a therapeutic contract skeleton outlining goals, approach,
   * timeline and focus areas derived from the integration and root rounds.
   */
  private generateTherapeuticContract(
    session: FuturegraphSessionDocument,
  ): {
    goals: any[];
    approach: string;
    timeline: string;
    focusAreas: any[];
  } {
    const integrationRound = session.rounds.find(
      (r) => r.roundNumber === 9,
    );
    const rootLayer = session.rounds.find(
      (r) => r.roundNumber === 6,
    );
    return {
      goals:
        (integrationRound?.analysis.therapeuticInsights as any[]) ?? [
          'To be determined in collaboration with client',
        ],
      approach: 'Integrative approach based on FutureGraph™ Pro+ findings',
      timeline:
        'Recommended 12-16 sessions with progress reviews every 4 sessions',
      focusAreas:
        (rootLayer?.analysis.identityAnchors as any[]) ?? [],
    };
  }

  /**
   * Derive an evolution timeline of identity anchors across all rounds.
   */
  private trackIdentityEvolution(
    session: FuturegraphSessionDocument,
  ): Array<{ round: number; layer: string; anchors: any[] }> {
    const evolution: Array<{ round: number; layer: string; anchors: any[] }> =
      [];
    session.rounds.forEach((round: any) => {
      if (
        round.analysis.identityAnchors &&
        round.analysis.identityAnchors.length > 0
      ) {
        evolution.push({
          round: round.roundNumber,
          layer: RoundDefinitions[round.roundNumber].name,
          anchors: round.analysis.identityAnchors,
        });
      }
    });
    return evolution;
  }

  /**
   * Extract voice and mask analysis from the relevant rounds.
   */
  private analyzeVoicesAndMasks(
    session: FuturegraphSessionDocument,
  ): {
    internalVoices: any[];
    defenseMechanisms: any[];
    integration: string;
  } {
    const voiceRound = session.rounds.find(
      (r) => r.roundNumber === 7,
    );
    const maskRound = session.rounds.find(
      (r) => r.roundNumber === 8,
    );
    return {
      internalVoices: voiceRound?.analysis.voices || [],
      defenseMechanisms: maskRound?.analysis.masks || [],
      integration:
        'Analysis of how voices and masks interact to form current personality structure',
    };
  }
}
