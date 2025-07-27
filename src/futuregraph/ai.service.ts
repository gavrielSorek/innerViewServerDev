import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { FuturegraphLaws } from './constants/futuregraph-laws';
import { RoundDefinitions } from './constants/round-definitions';
import { LanguageService, SupportedLanguage } from '../common/language.service';

/**
 * Service responsible for interacting with OpenAI to perform the
 * handwriting analysis for each FutureGraph round.  It constructs
 * localized prompts according to the requested language and
 * transparently falls back to English when unsupported codes are
 * supplied.  All interaction with OpenAI is encapsulated within this
 * class to allow centralised error handling and prompt management.
 */
@Injectable()
export class AiService {
  private readonly openai: OpenAI;

  constructor(
    private readonly configService: ConfigService,
    private readonly languageService: LanguageService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Analyze a single handwriting round.  The caller must provide the
   * round number, handwriting image (as base64), client context and any
   * additional therapist context.  An optional language code dictates
   * whether prompts and results should be generated in English ("en")
   * or Hebrew ("he").  Invalid or unsupported codes are silently
   * normalised to English.
   */
  async analyzeRound(
    roundNumber: number,
    handwritingImage: string,
    clientContext: any,
    additionalContext: any,
    previousRounds: any[],
    language?: string,
  ): Promise<any> {
    // Validate and normalise the language early
    const lang: SupportedLanguage = this.languageService.validate(language);

    const systemPrompt = this.createSystemPrompt(roundNumber, previousRounds, lang);
    const userPrompt = this.createUserPrompt(roundNumber, clientContext, additionalContext, lang);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4o',
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

      let content = (completion.choices[0].message.content as string)?.trim() ?? '';

      // 🧹 Remove markdown-style wrapping (```json ... ```) if present
      if (content.startsWith('```json')) {
        content = content.replace(/^```json/, '').trim();
      }
      if (content.endsWith('```')) {
        content = content.slice(0, -3).trim();
      }

      let analysis: any;
      try {
        analysis = JSON.parse(content);
      } catch {
        // Fallback structure when parsing fails
        analysis = {
          roundNumber,
          layer: this.languageService.getRoundName(roundNumber, lang),
          rawAnalysis: content,
          qaValidation: {
            passed: false,
            notes: 'Failed to parse structured response',
          },
        };
        return analysis;
      }

      // Attach cleaned rawAnalysis for traceability
      analysis.rawAnalysis = content;
      return analysis;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }

  /**
   * Build the system prompt containing the FutureGraph laws and guidance
   * for the current round.  Includes previous round summaries when
   * available to allow the AI to build upon earlier findings.  The
   * language parameter controls localisation of law names, round names
   * and certain fixed phrases.  When Hebrew is requested a final
   * instruction is added prompting the model to respond in Hebrew.
   */
  private createSystemPrompt(
    roundNumber: number,
    previousRounds: any[],
    language: SupportedLanguage,
  ): string {
    const roundName = this.languageService.getRoundName(roundNumber, language);
    const roundFocus = this.languageService.getRoundFocus(roundNumber, language);

    // Build previous rounds summary if applicable
    const previous = previousRounds.length > 0
      ? `\n${this.languageService.getPhrase('previousFindings', language)}\n${previousRounds
          .map(
            (r: any) => `Round ${r.roundNumber}: ${JSON.stringify(r.analysis)}`,
          )
          .join('\n')}\n`
      : '';

    // Build laws list in order.  Sub‑bullet points remain in English as they
    // reference technical validation instructions.
    const lawOrder = [
      'controlledFlexibility',
      'biDirectionalTime',
      'oneLayerInfluence',
      'layerSynchronization',
      'dynamicIdentityAnchor',
      'voiceNotMask',
      'signFlexibility',
      'syncBeforeTreatment',
      'securedVoiceDialogue',
      'interRoundPause',
      'roundControl',
    ];

    let lawsSection = '';
    lawOrder.forEach((lawKey, idx) => {
      const name = this.languageService.getLawName(lawKey, language);
      const desc = this.languageService.getLawDescription(lawKey, language);
      lawsSection += `${idx + 1}. ${name}: ${desc}\n`;

      // Add specific bullet points for certain laws only when in English;
      // for Hebrew we rely on the translated description to convey meaning.
      if (lawKey === 'controlledFlexibility' && language === 'en') {
        lawsSection +=
          '   - Every additional sign must be documented with justification\n' +
          '   - Signs must align with current round\'s context\n' +
          '   - No secondary sign may contradict core indicators\n';
      }
      if (lawKey === 'biDirectionalTime' && language === 'en') {
        lawsSection +=
          '   - Later insights may revise earlier interpretations within same or adjacent layer\n' +
          '   - Early findings (Rounds 1-2) serve as interpretive anchors\n';
      }
      if (lawKey === 'oneLayerInfluence' && language === 'en') {
        lawsSection +=
          '   - Exceptions only for: consistent markers, aligned voices, cross-validation\n';
      }
    });

    const intro = this.languageService.getPhrase('systemIntro', language);
    const analysisStructureHeader = this.languageService.getPhrase('analysisStructure', language);
    const provideJson = this.languageService.getPhrase('provideJson', language);

    // Build the full prompt
    let prompt = `${intro}\nYou are currently conducting Round ${roundNumber}: ${roundName}.\nFocus: ${roundFocus}\n\n` +
      `CRITICAL LAWS TO FOLLOW:\n\n${lawsSection}\n` +
      `${analysisStructureHeader}\n` +
      '1. Identify graphological signs relevant to ' + roundName + '\n' +
      '2. Connect findings to previous rounds (if applicable)\n' +
      '3. Apply QA validation to each insight\n' +
      '4. Document any retroactive influences on earlier layers\n' +
      '5. Update identity anchors based on new findings\n\n' +
      previous +
      `${provideJson}\n` +
      '{\n' +
      `  "roundNumber": ${roundNumber},\n` +
      `  "layer": "${roundName}",\n` +
      '  "graphologicalSigns": [],\n' +
      '  "emotionalIndicators": [],\n' +
      '  "identityAnchors": [],\n' +
      '  "therapeuticInsights": [],\n' +
      '  "retroactiveInfluences": [],\n' +
      '  "qaValidation": {\n' +
      '    "passed": boolean,\n' +
      '    "notes": string\n' +
      '  }\n' +
      '}';

    // If Hebrew is requested, explicitly instruct the model to respond in Hebrew
    if (language === 'he') {
      prompt += `\n\n${this.languageService.getPhrase('respondInLanguage', language)}`;
    }
    return prompt;
  }

  /**
   * Build a user-facing prompt summarising the client context and any
   * therapist context, instructing the AI to analyse the handwriting
   * sample for the specified round.  The text is localised using the
   * LanguageService.
   */
  private createUserPrompt(
    roundNumber: number,
    clientContext: any,
    additionalContext: any,
    language: SupportedLanguage,
  ): string {
    const roundName = this.languageService.getRoundName(roundNumber, language);
    return `${this.languageService.getPhrase('analyzePrompt', language)} ${roundNumber}.\n` +
      `${this.languageService.getPhrase('clientContext', language)}: ${JSON.stringify(clientContext)}\n` +
      `${this.languageService.getPhrase('additionalContext', language)}: ${JSON.stringify(additionalContext)}\n\n` +
      `${this.languageService.getPhrase('applyLaws', language)} ${roundName} ${this.languageService.getPhrase('layer', language)}`;
  }
}