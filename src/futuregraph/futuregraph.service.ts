// src/futuregraph/futuregraph.service.ts
import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { FuturegraphSession, FuturegraphSessionDocument } from './schemas/futuregraph-session.schema';
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
    private sessionModel: Model<FuturegraphSessionDocument>,
    private aiService: AiService
  ) {}

  async startSession(dto: StartSessionDto): Promise<string> {
    const sessionId = `fg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session = new this.sessionModel({
      sessionId,
      userId: dto.userId,
      clientId: dto.clientId,
      handwritingImage: dto.handwritingImage,
      clientContext: dto.clientContext,
      startTime: new Date(),
      rounds: [],
      currentRound: 0,
      status: 'active'
    });

    await session.save();
    return sessionId;
  }

  async processRound(dto: ProcessRoundDto) {
    const session = await this.sessionModel.findOne({ 
      sessionId: dto.sessionId 
    }).exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    // Validate according to FutureGraph laws
    this.validateRoundProgression(session, dto.roundNumber);

    // Get AI analysis
    const analysis = await this.aiService.analyzeRound(
      dto.roundNumber,
      session.handwritingImage,
      session.clientContext,
      dto.additionalContext,
      session.rounds
    );

    // Validate analysis according to laws
    const validation = this.validateAnalysis(analysis, session);
    analysis.qaValidation = validation;

    // Store round data
    const roundData = {
      roundNumber: dto.roundNumber,
      timestamp: new Date(),
      analysis,
      additionalContext: dto.additionalContext,
      therapistApproved: false
    };

    session.rounds.push(roundData);
    session.currentRound = dto.roundNumber;
    await session.save();

    return {
      roundNumber: dto.roundNumber,
      analysis,
      validation,
      requiresApproval: true
    };
  }

  async getSessionStatus(sessionId: string) {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const completedRounds = session.rounds.filter(r => r.therapistApproved).length;
    const isComplete = completedRounds === 10;

    return {
      sessionId: session.sessionId,
      status: session.status,
      currentRound: session.currentRound,
      completedRounds,
      totalRounds: 10,
      isComplete,
      rounds: session.rounds.map(r => ({
        number: r.roundNumber,
        completed: r.therapistApproved,
        timestamp: r.timestamp
      }))
    };
  }

  async generateReport(sessionId: string) {
    const session = await this.sessionModel.findOne({ sessionId }).exec();
    
    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const completedRounds = session.rounds.filter(r => r.therapistApproved).length;
    if (completedRounds < 10) {
      throw new BadRequestException(
        `All rounds must be completed before generating report. Completed: ${completedRounds}/10`
      );
    }

    return {
      sessionId: session.sessionId,
      clientId: session.clientId,
      generatedAt: new Date(),
      executiveSummary: this.generateExecutiveSummary(session),
      detailedFindings: this.generateDetailedFindings(session),
      treatmentRecommendations: this.generateTreatmentRecommendations(session),
      therapeuticContract: this.generateTherapeuticContract(session),
      identityEvolution: this.trackIdentityEvolution(session),
      voiceMaskAnalysis: this.analyzeVoicesAndMasks(session)
    };
  }

  async submitFeedback(dto: SubmitFeedbackDto) {
    const session = await this.sessionModel.findOne({ 
      sessionId: dto.sessionId 
    }).exec();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const roundIndex = session.rounds.findIndex(r => r.roundNumber === dto.roundNumber);
    if (roundIndex === -1) {
      throw new NotFoundException('Round not found');
    }

    session.rounds[roundIndex].therapistFeedback = dto.feedback;
    session.rounds[roundIndex].therapistApproved = dto.approved;
    session.rounds[roundIndex].approvalTimestamp = new Date();

    if (!dto.approved) {
      session.rounds[roundIndex].requiresReprocessing = true;
    }

    await session.save();

    return { 
      success: true, 
      message: dto.approved ? 'Round approved' : 'Round marked for reprocessing'
    };
  }

  private validateRoundProgression(session: any, roundNumber: number) {
    // Inter-Round Pause Law
    if (roundNumber > 1 && session.rounds.length < roundNumber - 1) {
      throw new BadRequestException(
        'Previous rounds must be completed first (Inter-Round Pause Law)'
      );
    }

    // Sync Products Before Treatment Law
    if (roundNumber >= 7 && roundNumber <= 10) {
      const diagnosticRoundsComplete = session.rounds.filter(r => 
        r.roundNumber >= 1 && r.roundNumber <= 6 && r.qaValidation?.passed
      ).length === 6;
      
      if (!diagnosticRoundsComplete) {
        throw new BadRequestException(
          'Diagnostic rounds 1-6 must be completed and QA approved before treatment rounds (Sync Products Before Treatment Law)'
        );
      }
    }
  }

  private validateAnalysis(analysis: any, session: any) {
    const validationResults = {
      passed: true,
      violations: [],
      warnings: []
    };

    // Check One-Layer Influence Constraint
    if (analysis.retroactiveInfluences) {
      analysis.retroactiveInfluences.forEach(influence => {
        const layerDiff = analysis.roundNumber - influence.targetRound;
        if (layerDiff > 1) {
          const hasException = FuturegraphLaws.oneLayerInfluence.exceptions.some(
            exception => influence.validation?.includes(exception)
          );
          if (!hasException) {
            validationResults.passed = false;
            validationResults.violations.push(
              `One-Layer Influence violated: Round ${analysis.roundNumber} attempting to influence Round ${influence.targetRound}`
            );
          }
        }
      });
    }

    // Check Sign Flexibility
    if (analysis.graphologicalSigns) {
      analysis.graphologicalSigns.forEach((sign, index) => {
        if (!sign.justification || !sign.therapeuticRelevance) {
          validationResults.warnings.push(
            `Sign ${index + 1} missing required justification or therapeutic relevance`
          );
        }
      });
    }

    // Voice ≠ Mask validation for rounds 7-8
    if (analysis.roundNumber === 7 || analysis.roundNumber === 8) {
      if (analysis.voices && analysis.masks) {
        const overlap = analysis.voices.filter(voice => 
          analysis.masks.some(mask => mask.id === voice.id)
        );
        if (overlap.length > 0) {
          validationResults.violations.push(
            `Voice ≠ Mask principle violated: Found ${overlap.length} overlapping identifications`
          );
          validationResults.passed = false;
        }
      }
    }

    return validationResults;
  }

  private generateExecutiveSummary(session: any): string {
    const visibleLayer = session.rounds.find(r => r.roundNumber === 1)?.analysis;
    const rootLayer = session.rounds.find(r => r.roundNumber === 6)?.analysis;
    const treatment = session.rounds.find(r => r.roundNumber === 10)?.analysis;
    
    return `Based on comprehensive FutureGraph™ Pro+ analysis across 10 diagnostic rounds, 
the client presents with ${visibleLayer?.graphologicalSigns?.[0]?.interpretation || 'complex patterns'} 
at the visible layer, evolving to ${rootLayer?.identityAnchors?.[0] || 'deep-seated identity structures'} 
at the root level. Primary treatment recommendations include ${treatment?.therapeuticInsights?.[0] || 'targeted interventions'}.`;
  }

  private generateDetailedFindings(session: any) {
    const findings = {};
    
    session.rounds.forEach(round => {
      findings[`Round ${round.roundNumber}: ${RoundDefinitions[round.roundNumber].name}`] = {
        graphologicalSigns: round.analysis.graphologicalSigns,
        emotionalIndicators: round.analysis.emotionalIndicators,
        therapeuticInsights: round.analysis.therapeuticInsights,
        retroactiveInfluences: round.analysis.retroactiveInfluences
      };
    });
    
    return findings;
  }

  private generateTreatmentRecommendations(session: any): string[] {
    const treatmentRound = session.rounds.find(r => r.roundNumber === 10);
    const recommendations = treatmentRound?.analysis.therapeuticInsights || [];
    
    const voiceRound = session.rounds.find(r => r.roundNumber === 7);
    const maskRound = session.rounds.find(r => r.roundNumber === 8);
    
    if (voiceRound?.analysis.voices?.length > 0) {
      recommendations.push('Voice dialogue work to integrate internal parts');
    }
    
    if (maskRound?.analysis.masks?.length > 0) {
      recommendations.push('Exploration of defense mechanisms and authentic self');
    }
    
    return recommendations;
  }

  private generateTherapeuticContract(session: any) {
    const integrationRound = session.rounds.find(r => r.roundNumber === 9);
    const rootLayer = session.rounds.find(r => r.roundNumber === 6);
    
    return {
      goals: integrationRound?.analysis.therapeuticInsights || ['To be determined in collaboration with client'],
      approach: 'Integrative approach based on FutureGraph™ Pro+ findings',
      timeline: 'Recommended 12-16 sessions with progress reviews every 4 sessions',
      focusAreas: rootLayer?.analysis.identityAnchors || []
    };
  }

  private trackIdentityEvolution(session: any) {
    const evolution = [];
    
    session.rounds.forEach(round => {
      if (round.analysis.identityAnchors && round.analysis.identityAnchors.length > 0) {
        evolution.push({
          round: round.roundNumber,
          layer: RoundDefinitions[round.roundNumber].name,
          anchors: round.analysis.identityAnchors
        });
      }
    });
    
    return evolution;
  }

  private analyzeVoicesAndMasks(session: any) {
    const voiceRound = session.rounds.find(r => r.roundNumber === 7);
    const maskRound = session.rounds.find(r => r.roundNumber === 8);
    
    return {
      internalVoices: voiceRound?.analysis.voices || [],
      defenseMechanisms: maskRound?.analysis.masks || [],
      integration: 'Analysis of how voices and masks interact to form current personality structure'
    };
  }
}