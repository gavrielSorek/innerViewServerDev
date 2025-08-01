// src/treatment-plans/treatment-plan-ai.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LanguageService, SupportedLanguage } from '../common/language.service';
import { SessionDetail } from './schemas/treatment-plan.schema';

interface GeneratePlanInput {
  analysis: any;
  report: any;
  clientContext: any;
  numberOfSessions: number;
  sessionDuration: number;
  overallGoal?: string;
  preferredMethods: string[];
  language: SupportedLanguage;
  focusArea?: string; // Added focus area
}

interface GeneratedPlan {
  overallGoal: string;
  preferredMethods: string[];
  treatmentApproach: string;
  sessions: SessionDetail[];
  summary: {
    keyThemes: string[];
    progressionStrategy: string;
    adaptationGuidelines: string;
    expectedOutcomes: string[];
  };
}

@Injectable()
export class TreatmentPlanAiService {
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
   * Generate a treatment plan based on FutureGraph analysis
   */
  async generateTreatmentPlan(input: GeneratePlanInput): Promise<GeneratedPlan> {
    const systemPrompt = this.createSystemPrompt(input.language);
    const userPrompt = this.createUserPrompt(input);

    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-nano',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
        response_format: { type: "json_object" },
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from AI');
      }

      const plan = JSON.parse(content) as GeneratedPlan;
      return this.validateAndEnrichPlan(plan, input);
    } catch (error) {
      console.error('Error generating treatment plan:', error);
      throw error;
    }
  }

  /**
   * Create system prompt for treatment plan generation
   */
  private createSystemPrompt(language: SupportedLanguage): string {
    const hebrewPrompt = `אתה מערכת מומחית-על קלינית-רגשית לבניית תוכניות טיפול המבוססות על ניתוח FutureGraph™.
עליך לבנות תוכנית טיפולית מותאמת אישית המשלבת גישה הוליסטית אינטגרטיבית.

התוכנית צריכה לכלול:
1. מטרה טיפולית מרכזית המבוססת על הניתוח
2. שיטות טיפול מגוונות כולל NLP, פסיכולוגיה (קוגניטיבית, התנהגותית, דינמית), דמיון מודרך, גוף-נפש ומיינדפולנס
3. רצף טיפולי מדורג: איתור → חקירה → עיבוד → שינוי → תרגול → הטמעה → חיזוק → אינטגרציה → סיכום
4. התאמה לזהות המרכזית, חוזים פנימיים ויכולות המטופל
5. שפה רכה, אתית, מעצימה ומעודדת

החזר תוכנית בפורמט JSON עם כל המפגשים המפורטים.`;

    const englishPrompt = `You are an expert clinical-emotional system for creating treatment plans based on FutureGraph™ analysis.
You must create a personalized treatment plan integrating a holistic integrative approach.

The plan should include:
1. A central therapeutic goal based on the analysis
2. Diverse treatment methods including NLP, psychology (cognitive, behavioral, dynamic), guided imagery, body-mind, and mindfulness
3. Graduated therapeutic sequence: identification → exploration → processing → change → practice → internalization → reinforcement → integration → summary
4. Adaptation to core identity, internal contracts, and client capabilities
5. Soft, ethical, empowering and encouraging language

Return a plan in JSON format with all sessions detailed.`;

    return language === 'he' ? hebrewPrompt : englishPrompt;
  }

  /**
   * Create user prompt with analysis context
   */
  private createUserPrompt(input: GeneratePlanInput): string {
    const {
      analysis,
      report,
      clientContext,
      numberOfSessions,
      sessionDuration,
      overallGoal,
      preferredMethods,
      language,
      focusArea,
    } = input;

    const clientInfo = `
Client Context: ${JSON.stringify(clientContext)}
Core Identity: ${analysis.coreIdentity?.name || 'Unknown'}
Main Challenges: ${JSON.stringify(analysis.limitingBeliefs)}
Internal Contracts: ${JSON.stringify(analysis.internalContracts?.contracts || [])}
Capabilities: ${JSON.stringify(analysis.intellectualEmotionalSocialCapabilities)}
Treatment Recommendations from Analysis: ${JSON.stringify(analysis.treatmentRecommendations || [])}
${focusArea ? `\nSPECIFIC FOCUS AREA: ${focusArea}` : ''}
`;

    const focusInstruction = focusArea
      ? language === 'he'
        ? `\n\nחשוב: תוכנית הטיפול צריכה להתמקד במיוחד בתחום: ${focusArea}
כל המפגשים צריכים לתרום להתקדמות בתחום זה.
המטרה הכללית חייבת להתייחס לתחום המיקוד הזה.`
        : `\n\nIMPORTANT: The treatment plan should specifically focus on: ${focusArea}
All sessions should contribute to progress in this area.
The overall goal must relate to this focus area.`
      : '';

    const requirements = language === 'he'
      ? `בנה תוכנית טיפול של ${numberOfSessions} מפגשים, כל מפגש ${sessionDuration} דקות.
${overallGoal ? `מטרת-על: ${overallGoal}` : focusArea ? `הגדר מטרת-על הקשורה ל: ${focusArea}` : 'הגדר מטרת-על מתאימה'}
${preferredMethods.length > 0 ? `שיטות מועדפות: ${preferredMethods.join(', ')}` : 'בחר שיטות מתאימות'}${focusInstruction}

עבור כל מפגש ספק:
- מטרה טיפולית ממוקדת
- שיטות טיפוליות (לפחות 3)
- טכניקה/תרגול עיקרי
- הנחיה קלינית למטפל (כולל שאלות פתוחות ודגשים)
- ניסוח תרגול למטופל (בגובה עיניים, שפה רכה)
- חלוקת זמן פנימית (פתיחה, חקירה, תרגול, עיבוד, סיכום)

כל התוכן בעברית בלבד.`
      : `Create a treatment plan for ${numberOfSessions} sessions, each ${sessionDuration} minutes.
${overallGoal ? `Overall goal: ${overallGoal}` : focusArea ? `Define an overall goal related to: ${focusArea}` : 'Define an appropriate overall goal'}
${preferredMethods.length > 0 ? `Preferred methods: ${preferredMethods.join(', ')}` : 'Choose appropriate methods'}${focusInstruction}

For each session provide:
- Focused therapeutic goal
- Therapeutic methods (at least 3)
- Main technique/exercise
- Clinical guidance for therapist (including open questions and emphases)
- Exercise formulation for client (accessible, soft language)
- Internal time allocation (opening, exploration, practice, processing, closing)

All content in English only.`;

    const jsonStructure = `
Return a JSON object with this exact structure:
{
  "overallGoal": "string",
  "preferredMethods": ["string"],
  "treatmentApproach": "string",
  "sessions": [
    {
      "sessionNumber": 1,
      "therapeuticGoal": "string",
      "methodsUsed": ["string"],
      "mainTechnique": "string",
      "therapistGuidance": "string",
      "clientExercise": "string",
      "timeAllocation": {
        "opening": number,
        "exploration": number,
        "practice": number,
        "processing": number,
        "closing": number
      }
    }
  ],
  "summary": {
    "keyThemes": ["string"],
    "progressionStrategy": "string",
    "adaptationGuidelines": "string",
    "expectedOutcomes": ["string"]
  }
}

${language === 'he' ? 'All content must be in Hebrew.' : 'All content must be in English.'}`;

    return `${clientInfo}\n\n${requirements}\n\n${jsonStructure}`;
  }

  /**
   * Validate and enrich the generated plan
   */
  private validateAndEnrichPlan(plan: any, input: GeneratePlanInput): GeneratedPlan {
    // Ensure all required fields are present
    const validatedPlan: GeneratedPlan = {
      overallGoal: plan.overallGoal || this.getDefaultGoal(input.language),
      preferredMethods: plan.preferredMethods || this.getDefaultMethods(input.language),
      treatmentApproach: plan.treatmentApproach || this.getDefaultApproach(input.language),
      sessions: [],
      summary: {
        keyThemes: plan.summary?.keyThemes || [],
        progressionStrategy: plan.summary?.progressionStrategy || '',
        adaptationGuidelines: plan.summary?.adaptationGuidelines || '',
        expectedOutcomes: plan.summary?.expectedOutcomes || [],
      },
    };

    // Validate and enrich sessions
    for (let i = 0; i < input.numberOfSessions; i++) {
      const sessionData = plan.sessions?.[i] || {};
      const session: SessionDetail = {
        sessionNumber: i + 1,
        therapeuticGoal: sessionData.therapeuticGoal || this.getDefaultSessionGoal(i + 1, input.language),
        methodsUsed: sessionData.methodsUsed || this.getDefaultMethods(input.language),
        mainTechnique: sessionData.mainTechnique || this.getDefaultTechnique(input.language),
        therapistGuidance: sessionData.therapistGuidance || this.getDefaultGuidance(input.language),
        clientExercise: sessionData.clientExercise || this.getDefaultExercise(input.language),
        timeAllocation: this.validateTimeAllocation(sessionData.timeAllocation, input.sessionDuration),
      };
      validatedPlan.sessions.push(session);
    }

    return validatedPlan;
  }

  /**
   * Validate time allocation for a session
   */
  private validateTimeAllocation(allocation: any, totalDuration: number): SessionDetail['timeAllocation'] {
    const defaultAllocation = this.getDefaultTimeAllocation(totalDuration);
    
    if (!allocation) {
      return defaultAllocation;
    }

    const total = (allocation.opening || 0) + 
                  (allocation.exploration || 0) + 
                  (allocation.practice || 0) + 
                  (allocation.processing || 0) + 
                  (allocation.closing || 0);

    // If allocation doesn't add up to total duration, use defaults
    if (Math.abs(total - totalDuration) > 5) {
      return defaultAllocation;
    }

    return {
      opening: allocation.opening || defaultAllocation.opening,
      exploration: allocation.exploration || defaultAllocation.exploration,
      practice: allocation.practice || defaultAllocation.practice,
      processing: allocation.processing || defaultAllocation.processing,
      closing: allocation.closing || defaultAllocation.closing,
    };
  }

  // Default value helpers
  private getDefaultGoal(language: SupportedLanguage): string {
    return language === 'he'
      ? 'השגת אינטגרציה אישית, שחרור חסימות רגשיות ומימוש הפוטנציאל העצמי'
      : 'Achieving personal integration, releasing emotional blocks, and realizing self-potential';
  }

  private getDefaultMethods(language: SupportedLanguage): string[] {
    return language === 'he'
      ? ['NLP', 'פסיכולוגיה קוגניטיבית', 'דמיון מודרך', 'מיינדפולנס']
      : ['NLP', 'Cognitive Psychology', 'Guided Imagery', 'Mindfulness'];
  }

  private getDefaultApproach(language: SupportedLanguage): string {
    return language === 'he'
      ? 'גישה הוליסטית אינטגרטיבית'
      : 'Holistic Integrative Approach';
  }

  private getDefaultSessionGoal(sessionNumber: number, language: SupportedLanguage): string {
    return language === 'he'
      ? `מטרת מפגש ${sessionNumber}`
      : `Session ${sessionNumber} Goal`;
  }

  private getDefaultTechnique(language: SupportedLanguage): string {
    return language === 'he'
      ? 'טכניקת עבודה מרכזית'
      : 'Main Working Technique';
  }

  private getDefaultGuidance(language: SupportedLanguage): string {
    return language === 'he'
      ? 'הנחיות למטפל'
      : 'Therapist Guidance';
  }

  private getDefaultExercise(language: SupportedLanguage): string {
    return language === 'he'
      ? 'תרגול למטופל'
      : 'Client Exercise';
  }

  private getDefaultTimeAllocation(totalDuration: number): SessionDetail['timeAllocation'] {
    // Default allocation based on 50-minute session
    const ratio = totalDuration / 50;
    return {
      opening: Math.round(5 * ratio),
      exploration: Math.round(10 * ratio),
      practice: Math.round(20 * ratio),
      processing: Math.round(10 * ratio),
      closing: Math.round(5 * ratio),
    };
  }
}