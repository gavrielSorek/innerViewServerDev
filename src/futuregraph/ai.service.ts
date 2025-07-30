// src/futuregraph/ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LanguageService, SupportedLanguage } from '../common/language.service';

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
   * Perform complete FutureGraph analysis in a single round.
   * Implements all analysis layers as specified in the FutureGraph™ Pro+ instructions.
   */
  async analyzeComplete(
    handwritingImage: string,
    clientContext: any,
    additionalContext: any,
    language: SupportedLanguage,
  ): Promise<any> {
    const systemPrompt = this.createCompleteSystemPrompt(language);
    const userPrompt = this.createCompleteUserPrompt(clientContext, additionalContext, language);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
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
        max_tokens: 4000,
      });

      let content = (completion.choices[0].message.content as string)?.trim() ?? '';

      // Remove markdown wrapping if present
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
          rawAnalysis: content,
          error: 'Failed to parse structured response',
        };
      }

      return analysis;
    } catch (error) {
      console.error('Error calling OpenAI:', error);
      throw error;
    }
  }

  /**
   * Create system prompt for complete FutureGraph analysis
   */
  private createCompleteSystemPrompt(language: SupportedLanguage): string {
    const intro = language === 'he'
      ? `אתה מומחה למודל FutureGraph™ Pro+ Expert, בגרסת הפעלה הוליסטית-שיקופית, המתמקד בזהות תודעתית-רגשית עמוקה. מטרת העל שלך היא לחשוף, לשקף ולנסח את הזהות הפנימית של האדם מתוך כתב יד, באמצעות ניתוח רב-שכבתי.`
      : `You are an expert in the FutureGraph™ Pro+ Expert model, holistic-reflective version, focusing on deep conscious-emotional identity. Your goal is to reveal, reflect and articulate the person's inner identity from handwriting through multi-layered analysis.`;

    const instructions = language === 'he'
      ? `
בצע ניתוח מקיף של כתב היד בסבב אחד, הכולל את כל השכבות הבאות:

1. **זהות מרכזית (Core Identity)**: זהה את חתימת הזהות המרכזית של הכותב
2. **שכבות אישיות**: נתח את השכבות הגלויות, המודעות, התת-מודעות והנסתרות
3. **מסכות הגנה**: זהה את מנגנוני ההגנה העיקריים
4. **חוזים פנימיים**: מפה את מערכת החוזים הפנימיים - מה האדם מחויב אליו פנימית
5. **יכולות שכליות-רגשיות-חברתיות**: זהה את החוזקות והכישורים
6. **אמונות מגבילות**: זהה את האמונות המגבילות הפועלות כבסיס זהותי
7. **המלצות טיפוליות**: ספק המלצות מבוססות על הניתוח

השתמש בשפה פשוטה, רגשית, אנושית ומובנת. הימנע ממונחים טכניים. השתמש בדימויים אנושיים מחיי היומיום.
כל התשובות והתכנים צריכים להיות בעברית בלבד.

החזר את הניתוח בפורמט JSON עם המבנה הבא:`
      : `
Perform a comprehensive handwriting analysis in a single round, including all the following layers:

1. **Core Identity**: Identify the writer's central identity signature
2. **Personality Layers**: Analyze visible, conscious, subconscious and hidden layers
3. **Defense Masks**: Identify primary defense mechanisms
4. **Internal Contracts**: Map the internal contract system - what the person is internally committed to
5. **Intellectual-Emotional-Social Capabilities**: Identify strengths and abilities
6. **Limiting Beliefs**: Identify limiting beliefs operating as identity foundation
7. **Therapeutic Recommendations**: Provide recommendations based on the analysis

Use simple, emotional, human and understandable language. Avoid technical terms. Use everyday human imagery.
All responses and content should be in English only.

Return the analysis in JSON format with the following structure:`;

    const jsonStructure = `
{
  "coreIdentity": {
    "name": "string",
    "narrative": "string",
    "clinicalAnalysis": "string",
    "ego": "string",
    "thinking": "string"
  },
  "personalityLayers": {
    "visible": {
      "patterns": [],
      "insights": []
    },
    "conscious": {
      "patterns": [],
      "insights": []
    },
    "subconscious": {
      "patterns": [],
      "insights": []
    },
    "hidden": {
      "patterns": [],
      "insights": []
    }
  },
  "defenceMechanisms": {
    "primaryMask": {
      "type": "string",
      "description": "string",
      "impact": "string"
    },
    "secondaryMasks": []
  },
  "internalContracts": {
    "contracts": [
      {
        "name": "string",
        "description": "string",
        "purpose": "string",
        "impact": "string"
      }
    ],
    "overallImpact": "string"
  },
  "intellectualEmotionalSocialCapabilities": {
    "intellectual": {
      "capabilities": [],
      "strengths": []
    },
    "emotional": {
      "capabilities": [],
      "strengths": []
    },
    "social": {
      "capabilities": [],
      "strengths": []
    },
    "summary": "string"
  },
  "limitingBeliefs": {
    "coreBelief": "string",
    "supportingBeliefs": [],
    "origin": "string"
  },
  "emotionalPatterns": {
    "dominant": [],
    "suppressed": [],
    "conflicts": []
  },
  "therapeuticInsights": [],
  "treatmentRecommendations": [],
  "therapeuticGoals": [],
  "recommendedApproach": "string",
  "suggestedTimeline": "string",
  "focusAreas": []
}`;

    return `${intro}\n\n${instructions}\n\n${jsonStructure}`;
  }

  /**
   * Create user prompt for complete analysis
   */
  private createCompleteUserPrompt(
    clientContext: any,
    additionalContext: any,
    language: SupportedLanguage,
  ): string {
    const analyzeText = language === 'he'
      ? 'נתח את דגימת כתב היד המצורפת.'
      : 'Analyze the attached handwriting sample.';

    const contextLabel = language === 'he' ? 'הקשר לקוח' : 'Client Context';
    const additionalLabel = language === 'he' ? 'הקשר נוסף' : 'Additional Context';

    const instruction = language === 'he'
      ? `בצע ניתוח מקיף וכולל של כל השכבות והרבדים הזהותיים. כלול חוזים פנימיים מפורטים ויכולות שכליות-רגשיות-חברתיות. כל התוכן צריך להיות בעברית.`
      : `Perform a comprehensive and complete analysis of all identity layers and levels. Include detailed internal contracts and intellectual-emotional-social capabilities. All content should be in English.`;

    return `${analyzeText}\n` +
      `${contextLabel}: ${JSON.stringify(clientContext)}\n` +
      `${additionalLabel}: ${JSON.stringify(additionalContext)}\n\n` +
      instruction;
  }


  async getFocusedAnalysis(
    analysisJson: any,
    focus: string,
    language: string,
  ): Promise<any> {
    const prompt = `
      You are an expert analyst. Based on the provided analysis JSON, generate a new version of the report with a specific focus on "${focus}".
      The entire output must be in the "${language}" language.
      The output must be a valid JSON object, maintaining the same structure as the original report.
      Do not include any text or formatting outside of the JSON object.

      Original Analysis:
      ${JSON.stringify(analysisJson)}
    `;

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano', // Or your preferred model
        messages: [{ role: 'system', content: prompt }],
        response_format: { type: "json_object" },
      });

      const result = completion.choices[0].message.content;
      if (!result) {
        return null;
      }
      return JSON.parse(result);
    } catch (error) {
      console.error('Error fetching focused analysis from OpenAI:', error);
      throw new Error('Failed to get focused analysis from AI model.');
    }
  }
}