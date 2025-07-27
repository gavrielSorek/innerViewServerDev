import { Injectable } from '@nestjs/common';

/**
 * Supported language codes for the Inner View AI services.
 */
export type SupportedLanguage = 'en' | 'he';

/**
 * A small helper service responsible for validating and translating
 * localized strings used throughout the FutureGraph pipeline and the
 * generic AI chat.  Currently supports English (en) and Hebrew (he).
 *
 * If a requested language is not supported, the service will gracefully
 * fall back to English.  Translation mappings cover the names and
 * descriptions of FutureGraph laws, round definitions and a handful of
 * fixed phrases used in prompts and summaries.  Additional keys can
 * easily be added as the system grows.
 */
@Injectable()
export class LanguageService {
  /** List of recognized language codes */
  private readonly supported: SupportedLanguage[] = ['en', 'he'];

  /**
   * Validate an incoming language code.  Returns a valid language
   * (defaulting to English) to avoid propagating invalid values.
   */
  validate(language?: string): SupportedLanguage {
    if (language && this.supported.includes(language as SupportedLanguage)) {
      return language as SupportedLanguage;
    }
    return 'en';
  }

  /** Translation tables for FutureGraph law names keyed by law ID. */
  private readonly lawNames: Record<string, Record<SupportedLanguage, string>> = {
    controlledFlexibility: {
      en: 'Controlled Flexibility Law',
      he: 'חוק גמישות מבוקרת',
    },
    biDirectionalTime: {
      en: 'Bi-Directional Time Law',
      he: 'חוק זמן דו‑כיווני',
    },
    oneLayerInfluence: {
      en: 'One-Layer Influence Constraint',
      he: 'מגבלת השפעה של שכבה אחת',
    },
    layerSynchronization: {
      en: 'Layer Synchronization Law',
      he: 'חוק סנכרון שכבות',
    },
    dynamicIdentityAnchor: {
      en: 'Dynamic Identity Anchor',
      he: 'עוגן זהות דינמי',
    },
    voiceNotMask: {
      en: 'Voice ≠ Mask Principle',
      he: 'עקרון קול ≠ מסכה',
    },
    signFlexibility: {
      en: 'Sign Flexibility Principle',
      he: 'עקרון גמישות סימנים',
    },
    syncBeforeTreatment: {
      en: 'Sync Products Before Treatment Law',
      he: 'חוק סנכרון תוצרים לפני טיפול',
    },
    securedVoiceDialogue: {
      en: 'Secured Voice Dialogue Law',
      he: 'חוק דיאלוג קול מאובטח',
    },
    interRoundPause: {
      en: 'Inter-Round Pause Law',
      he: 'חוק הפסקה בין סבבים',
    },
    roundControl: {
      en: 'Round Control Table',
      he: 'טבלת בקרת סבבים',
    },
  };

  /** Translation tables for FutureGraph law descriptions keyed by law ID. */
  private readonly lawDescriptions: Record<string, Record<SupportedLanguage, string>> = {
    controlledFlexibility: {
      en: 'Allows controlled inclusion of secondary graphological signs beyond core indicators',
      he: 'מאפשר הכללה מבוקרת של סימנים גרפולוגיים משניים מעבר לאינדיקטורים המרכזיים',
    },
    biDirectionalTime: {
      en: 'Establishes influence between early and later findings',
      he: 'קובע השפעה בין ממצאים מוקדמים ומאוחרים',
    },
    oneLayerInfluence: {
      en: 'Insights may retroactively affect only one earlier layer',
      he: 'תובנות יכולות להשפיע באופן רטרואקטיבי רק על שכבה אחת קודמת',
    },
    layerSynchronization: {
      en: 'Deep interpretation must echo from visible layer',
      he: 'פירוש עמוק חייב להדהד מהשכבה הגלויה',
    },
    dynamicIdentityAnchor: {
      en: "Client's central identity updated each round",
      he: 'הזהות המרכזית של המטופל מתעדכנת בכל סיבוב',
    },
    voiceNotMask: {
      en: 'Voice = Internal contradiction, Mask = Defense against external',
      he: 'קול = סתירה פנימית, מסכה = הגנה מפני חוץ',
    },
    signFlexibility: {
      en: 'Permits inclusion of signs if emotionally/narratively consistent',
      he: 'מאפשר הכללת סימנים אם הם תואמים רגשית/נרטיבית',
    },
    syncBeforeTreatment: {
      en: 'All diagnostic products must be completed before rounds 7-10',
      he: 'כל התוצרים הדיאגנוסטיים חייבים להסתיים לפני סבבים 7–10',
    },
    securedVoiceDialogue: {
      en: 'Voice valid only if rooted in mask, trauma, or therapeutic contract',
      he: 'קול תקף רק אם מושרש במסכה, טראומה או חוזה טיפולי',
    },
    interRoundPause: {
      en: 'No automatic transition between rounds',
      he: 'אין מעבר אוטומטי בין סבבים',
    },
    roundControl: {
      en: 'Evaluate conflicts, consistency, emotional load, and validity',
      he: 'הערך התנגשויות, עקביות, עומס רגשי ותוקף',
    },
  };

  /** Translation tables for round names keyed by round number. */
  private readonly roundNames: Record<number, Record<SupportedLanguage, string>> = {
    1: { en: 'Visible Layer', he: 'שכבה גלויה' },
    2: { en: 'Conscious Layer', he: 'שכבה מודעת' },
    3: { en: 'Subconscious Layer', he: 'שכבת התת‑מודע' },
    4: { en: 'Hidden Layer', he: 'שכבה נסתרת' },
    5: { en: 'Shadow Layer', he: 'שכבת צל' },
    6: { en: 'Root Layer', he: 'שכבת שורש' },
    7: { en: 'Voice Dialogue', he: 'דיאלוג קולות' },
    8: { en: 'Mask Analysis', he: 'ניתוח מסכות' },
    9: { en: 'Integration', he: 'אינטגרציה' },
    10: { en: 'Treatment Recommendations', he: 'המלצות טיפול' },
  };

  /** Translation tables for round focus descriptions keyed by round number. */
  private readonly roundFocuses: Record<number, Record<SupportedLanguage, string>> = {
    1: {
      en: 'Initial impressions, obvious patterns in handwriting',
      he: 'רשמים ראשוניים, דפוסים ברורים בכתב היד',
    },
    2: {
      en: 'Surface patterns, conscious behaviors and choices',
      he: 'דפוסים שטחיים, התנהגויות ובחירות מודעות',
    },
    3: {
      en: 'Deeper motivations, hidden desires and drives',
      he: 'מניעים עמוקים, רצונות חבויים ודחפים',
    },
    4: {
      en: 'Core dynamics, repressed content and conflicts',
      he: 'דינמיקות ליבה, תוכן מודחק וקונפליקטים',
    },
    5: {
      en: 'Unconscious patterns, shadow elements and projections',
      he: 'דפוסים לא מודעים, אלמנטים של צל והשלכות',
    },
    6: {
      en: 'Fundamental identity, core self and essence',
      he: 'זהות יסודית, העצמי המרכזי ומהות',
    },
    7: {
      en: 'Internal voices, sub‑personalities and parts work',
      he: 'קולות פנימיים, תת‑אישיות ועבודת חלקים',
    },
    8: {
      en: 'Defense mechanisms, personas and protective strategies',
      he: 'מנגנוני הגנה, פרסונות ואסטרטגיות הגנה',
    },
    9: {
      en: 'Synthesis of all layers into coherent understanding',
      he: 'סינתזה של כל השכבות לכדי הבנה קוהרנטית',
    },
    10: {
      en: 'Therapeutic interventions and treatment planning',
      he: 'התערבויות טיפוליות ותכנון טיפול',
    },
  };

  /**
   * Get the localized law name for the given law identifier.
   */
  getLawName(id: string, language: SupportedLanguage): string {
    return this.lawNames[id]?.[language] ?? this.lawNames[id]?.en ?? id;
  }

  /**
   * Get the localized law description for the given law identifier.
   */
  getLawDescription(id: string, language: SupportedLanguage): string {
    return this.lawDescriptions[id]?.[language] ?? this.lawDescriptions[id]?.en ?? '';
  }

  /**
   * Get the localized round name for the given round number.
   */
  getRoundName(round: number, language: SupportedLanguage): string {
    return this.roundNames[round]?.[language] ?? this.roundNames[round]?.en ?? `Round ${round}`;
  }

  /**
   * Get the localized round focus for the given round number.
   */
  getRoundFocus(round: number, language: SupportedLanguage): string {
    return this.roundFocuses[round]?.[language] ?? this.roundFocuses[round]?.en ?? '';
  }

  /**
   * Localize a fixed phrase used in prompts or error messages.
   * Extend this map as needed for additional strings.
   */
  private readonly phrases: Record<string, Record<SupportedLanguage, string>> = {
    systemIntro: {
      en: 'You are an AI therapist assistant implementing the FutureGraph™ Pro+ methodology.',
      he: 'אתה עוזר AI למטפלים המיישם את מתודולוגיית FutureGraph™ Pro+.',
    },
    analysisStructure: {
      en: 'ANALYSIS STRUCTURE FOR THIS ROUND:',
      he: 'מבנה הניתוח עבור סבב זה:',
    },
    provideJson: {
      en: 'Provide your analysis in JSON format with the following structure:',
      he: 'ספק את הניתוח בפורמט JSON עם המבנה הבא:',
    },
    previousFindings: {
      en: 'PREVIOUS ROUND FINDINGS TO CONSIDER:',
      he: 'ממצאי סבבים קודמים שיש לקחת בחשבון:',
    },
    analyzePrompt: {
      en: 'Analyze this handwriting sample for Round',
      he: 'נתח את דגימת כתב היד עבור סבב',
    },
    clientContext: {
      en: 'Client Context',
      he: 'הקשר לקוח',
    },
    additionalContext: {
      en: 'Additional Context',
      he: 'הקשר נוסף',
    },
    applyLaws: {
      en: 'Apply all FutureGraph™ Pro+ laws and provide detailed analysis focusing on the',
      he: 'החל את כל חוקי FutureGraph™ Pro+ וספק ניתוח מפורט המתמקד ב',
    },
    layer: {
      en: 'layer.',
      he: 'שכבה.',
    },
    respondInLanguage: {
      en: '',
      he: 'השב בעברית.',
    },

    // Phrases used in report summaries
    executiveSummaryIntro: {
      en: 'Based on comprehensive FutureGraph™ Pro+ analysis across 10 diagnostic rounds, the client presents with',
      he: 'בהתבסס על ניתוח מקיף של FutureGraph™ Pro+ לאורך 10 סבבים דיאגנוסטיים, המטופל מציג',
    },
    executiveSummaryEvolving: {
      en: 'evolving to',
      he: 'המתפתחת ל',
    },
    executiveSummaryRecommendation: {
      en: 'Primary treatment recommendations include',
      he: 'המלצות הטיפול העיקריות כוללות',
    },
    complexPatterns: {
      en: 'complex patterns',
      he: 'דפוסים מורכבים',
    },
    deepSeatedIdentity: {
      en: 'deep‑seated identity structures',
      he: 'מבני זהות עמוקים',
    },
    targetedInterventions: {
      en: 'targeted interventions',
      he: 'התערבויות ממוקדות',
    },

    // Messages used in QA validation
    oneLayerViolation: {
      en: 'One‑Layer Influence violated',
      he: 'הפרת מגבלת השפעה של שכבה אחת',
    },
    missingJustification: {
      en: 'missing required justification or therapeutic relevance',
      he: 'חסרה הנמקה נדרשת או רלוונטיות טיפולית',
    },
    voiceMaskViolation: {
      en: 'Voice ≠ Mask principle violated: Found',
      he: 'עקרון קול ≠ מסכה הופר: נמצאו',
    },

    // Voice/mask analysis summary used in the final report
    voiceMaskIntegration: {
      en: 'Analysis of how voices and masks interact to form current personality structure',
      he: 'ניתוח כיצד קולות ומסכות משתלבים כדי ליצור מבנה אישיות נוכחי',
    },
  };

  /** Return a localized fixed phrase for the given key. */
  getPhrase(key: string, language: SupportedLanguage): string {
    return this.phrases[key]?.[language] ?? this.phrases[key]?.en ?? key;
  }
}