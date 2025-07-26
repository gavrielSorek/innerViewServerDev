// AI service responsible for constructing prompts and invoking the
// OpenAI API to perform handwriting analysis for each round.  The
// service converts images to data URLs and enforces prompt structure.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FuturegraphLaws } from './constants/futuregraph-laws';
import { RoundDefinitions } from './constants/round-definitions';

@Injectable()
export class AiService {
  private readonly openai: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Analyze a single handwriting round.  Constructs system and user
   * prompts, calls the OpenAI API, and attempts to parse the JSON
   * result.  Falls back to a raw analysis object if parsing fails.
   */
  async analyzeRound(
    roundNumber: number,
    handwritingImage: string,
    clientContext: any,
    additionalContext: any,
    previousRounds: any[],
  ): Promise<any> {
    const systemPrompt = this.createSystemPrompt(
      roundNumber,
      previousRounds,
    );
    const userPrompt = this.createUserPrompt(
      roundNumber,
      clientContext,
      additionalContext,
    );
    try {
      const completion = await this.openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: 'system', content: systemPrompt },
          {
            role: 'user',
            content: [
              { type: 'text', text: userPrompt },
              {
                type: 'image_url',
                image_url: {
                  url: `data:image/jpeg;base64,${handwritingImage}`,
                },
              },
            ],
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      });
      let analysis: any;
      try {
        analysis = JSON.parse(
          completion.choices[0].message.content as string,
        );
      } catch {
        // Provide a default structure if parsing fails.
        analysis = {
          roundNumber,
          layer: RoundDefinitions[roundNumber].name,
          rawAnalysis: completion.choices[0].message.content,
          qaValidation: {
            passed: false,
            notes: 'Failed to parse structured response',
          },
        };
      }
      return analysis;
    } catch (error) {
      // Surface the error to the caller.
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }

  /**
   * Build the system prompt containing the FutureGraph laws and guidance
   * for the current round.  Includes previous round summaries when
   * available to allow the AI to build upon earlier findings.
   */
  private createSystemPrompt(
    roundNumber: number,
    previousRounds: any[],
  ): string {
    const round = RoundDefinitions[roundNumber];
    const previous =
      previousRounds.length > 0
        ? `
PREVIOUS ROUND FINDINGS TO CONSIDER:
${previousRounds
  .map(
    (r: any) =>
      `Round ${r.roundNumber}: ${JSON.stringify(r.analysis)}`,
  )
  .join('\n')}
`
        : '';
    return `You are an AI therapist assistant implementing the FutureGraph™ Pro+ methodology.
You are currently conducting Round ${roundNumber}: ${round.name}.
Focus: ${round.focus}

CRITICAL LAWS TO FOLLOW:

1. ${FuturegraphLaws.controlledFlexibility.name}: ${FuturegraphLaws.controlledFlexibility.description}
   - Every additional sign must be documented with justification
   - Signs must align with current round's context
   - No secondary sign may contradict core indicators

2. ${FuturegraphLaws.biDirectionalTime.name}: ${FuturegraphLaws.biDirectionalTime.description}
   - Later insights may revise earlier interpretations within same or adjacent layer
   - Early findings (Rounds 1-2) serve as interpretive anchors

3. ${FuturegraphLaws.oneLayerInfluence.name}: ${FuturegraphLaws.oneLayerInfluence.description}
   - Exceptions only for: consistent markers, aligned voices, cross-validation

4. ${FuturegraphLaws.layerSynchronization.name}: ${FuturegraphLaws.layerSynchronization.description}

5. ${FuturegraphLaws.dynamicIdentityAnchor.name}: ${FuturegraphLaws.dynamicIdentityAnchor.description}

6. ${FuturegraphLaws.voiceNotMask.name}: ${FuturegraphLaws.voiceNotMask.description}

7. ${FuturegraphLaws.signFlexibility.name}: ${FuturegraphLaws.signFlexibility.description}

8. ${FuturegraphLaws.syncBeforeTreatment.name}: ${FuturegraphLaws.syncBeforeTreatment.description}

9. ${FuturegraphLaws.securedVoiceDialogue.name}: ${FuturegraphLaws.securedVoiceDialogue.description}

10. ${FuturegraphLaws.interRoundPause.name}: ${FuturegraphLaws.interRoundPause.description}

11. ${FuturegraphLaws.roundControl.name}: ${FuturegraphLaws.roundControl.description}

ANALYSIS STRUCTURE FOR THIS ROUND:
1. Identify graphological signs relevant to ${round.name}
2. Connect findings to previous rounds (if applicable)
3. Apply QA validation to each insight
4. Document any retroactive influences on earlier layers
5. Update identity anchors based on new findings

${previous}

Provide your analysis in JSON format with the following structure:
{
  "roundNumber": ${roundNumber},
  "layer": "${round.name}",
  "graphologicalSigns": [
    {
      "sign": "description",
      "location": "where in handwriting",
      "interpretation": "meaning",
      "justification": "why included",
      "therapeuticRelevance": "clinical significance"
    }
  ],
  "emotionalIndicators": [],
  "identityAnchors": [],
  "therapeuticInsights": [],
  "retroactiveInfluences": [
    {
      "targetRound": number,
      "influence": "description",
      "validation": "how it meets one-layer constraint"
    }
  ],
  "qaValidation": {
    "passed": boolean,
    "notes": "validation details"
  }
}`;
  }

  /**
   * Build a user-facing prompt summarising the client context, any
   * additional therapist context, and instructing the AI to analyse the
   * handwriting for the specified round.
   */
  private createUserPrompt(
    roundNumber: number,
    clientContext: any,
    additionalContext: any,
  ): string {
    return `Analyze this handwriting sample for Round ${roundNumber}.
Client Context: ${JSON.stringify(clientContext)}
Additional Context: ${JSON.stringify(additionalContext)}

Apply all FutureGraph™ Pro+ laws and provide detailed analysis focusing on the ${
      RoundDefinitions[roundNumber].name
    } layer.`;
  }
}
