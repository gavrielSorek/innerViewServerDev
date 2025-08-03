// src/ai/ai-chat.service.ts
// Service providing a simple conversational interface with OpenAI GPT‑4.
//
// This implementation has been extended with optional localisation and
// FutureGraph session context. When a FutureGraph session is provided,
// the AI assistant can answer questions about the handwriting analysis
// with full knowledge of the report.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LanguageService, SupportedLanguage } from '../common/language.service';
import { 
  FuturegraphSessionContext,
  ClientContext,
  FuturegraphAnalysis,
  FuturegraphReport 
} from '../common/types';
import { BaseError, ExternalServiceError } from '../common/errors/custom-errors';

@Injectable()
export class AiChatService {
  private readonly openai: OpenAI;
  constructor(
    private readonly configService: ConfigService,
    private readonly languageService: LanguageService,
  ) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('openai.apiKey'),
    });
  }

  /**
   * Generate a chat response given a user message.  Provides a
   * therapeutic context to the system prompt to ensure ethical and
   * supportive answers.  The optional language parameter allows the
   * caller to request Hebrew responses.  When unspecified or invalid
   * English is used.
   * 
   * NEW: Optional sessionContext parameter provides FutureGraph analysis
   * context for informed responses about specific clients.
   */
  async getChatResponse(
    message: string,
    language?: string,
    sessionContext?: FuturegraphSessionContext | null,
  ): Promise<string> {
    const lang: SupportedLanguage = this.languageService.validate(language);
    
    // Build the system prompt based on whether we have session context
    const systemPrompt = sessionContext
      ? this.buildFuturegraphAwareSystemPrompt(lang, sessionContext)
      : this.buildGeneralSystemPrompt(lang);
    
    // Build the user message with context if available
    const userContent = sessionContext
      ? this.buildContextualUserMessage(message, sessionContext, lang)
      : message;

    try {
      const completion = await this.openai.chat.completions.create({
        model: this.configService.get<string>('openai.model') || 'gpt-4',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: userContent,
          },
        ],
        temperature: this.configService.get<number>('openai.temperature'),
        max_tokens: this.configService.get<number>('openai.maxTokens', 500),
      });
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        console.warn('OpenAI returned empty response');
        return lang === 'he'
          ? 'אני מתנצל, לא הצלחתי ליצור תשובה. אנא נסה שוב.'
          : 'I apologize, but I could not generate a response. Please try again.';
      }
      return responseContent.trim();
    } catch (error) {
      console.error('Error in AI chat:', error);
      
      if (error instanceof BaseError) {
        throw error;
      }
      
      // Extract error message if available
      const messageText: string =
        error instanceof Error ? error.message : String(error);
      
      if (messageText.includes('rate limit')) {
        throw new ExternalServiceError('OpenAI', 'Rate limit exceeded');
      }
      
      if (messageText.includes('API key')) {
        console.error('OpenAI API key issue detected');
        throw new ExternalServiceError('OpenAI', 'Configuration error');
      }
      
      throw new ExternalServiceError('OpenAI', error);
    }
  }

  /**
   * Build general system prompt for regular chat (no FutureGraph context)
   */
  private buildGeneralSystemPrompt(lang: SupportedLanguage): string {
    return lang === 'he'
      ? 'אתה עוזר AI למטפלים. ספק תשובות מקצועיות, אתיות ותומכות. השב בעברית.'
      : 'You are a helpful AI assistant for therapists. Provide professional, ethical, and supportive responses.';
  }

  /**
   * Build FutureGraph-aware system prompt with analysis context
   */
  private buildFuturegraphAwareSystemPrompt(
    lang: SupportedLanguage,
    sessionContext: FuturegraphSessionContext,
  ): string {
    const clientName = sessionContext.clientContext?.name || 
      (lang === 'he' ? 'המטופל' : 'the client');
    
    const basePrompt = lang === 'he'
      ? `אתה עוזר AI למטפלים המתמחה בניתוח תוצאות FutureGraph™. 
         יש לך גישה לניתוח כתב יד מלא של ${clientName}.
         ענה על שאלות המטפל בהתבסס על הממצאים בדוח.
         היה ספציפי והתייחס לממצאים הרלוונטיים מהניתוח.
         השתמש בשפה מקצועית אך ברורה.
         השב בעברית.`
      : `You are an AI assistant for therapists specializing in FutureGraph™ analysis interpretation.
         You have access to the complete handwriting analysis of ${clientName}.
         Answer the therapist's questions based on the findings in the report.
         Be specific and reference relevant findings from the analysis.
         Use professional but clear language.`;
    
    return basePrompt;
  }

  /**
   * Build contextual user message with FutureGraph analysis data
   */
  private buildContextualUserMessage(
    message: string,
    sessionContext: FuturegraphSessionContext,
    lang: SupportedLanguage,
  ): string {
    const clientInfo = this.formatClientInfo(sessionContext, lang);
    const analysisInfo = this.formatAnalysisInfo(sessionContext, lang);
    
    const contextPrompt = lang === 'he'
      ? `הקשר: אני מטפל ששואל לגבי ניתוח FutureGraph של המטופל שלי.

${clientInfo}

תוצאות הניתוח המלא:
${analysisInfo}

השאלה שלי: ${message}`
      : `Context: I am a therapist asking about the FutureGraph analysis of my client.

${clientInfo}

Complete Analysis Results:
${analysisInfo}

My question: ${message}`;
    
    return contextPrompt;
  }

  /**
   * Format client information for context
   */
  private formatClientInfo(
    sessionContext: FuturegraphSessionContext,
    lang: SupportedLanguage,
  ): string {
    const ctx: ClientContext = sessionContext.clientContext || {} as ClientContext;
    const label = lang === 'he' ? 'פרטי המטופל' : 'Client Information';
    const name = lang === 'he' ? 'שם' : 'Name';
    const age = lang === 'he' ? 'גיל' : 'Age';
    const purpose = lang === 'he' ? 'מטרת הטיפול' : 'Purpose';
    
    return `${label}:
- ${name}: ${ctx.name || (lang === 'he' ? 'לא צוין' : 'Not specified')}
- ${age}: ${ctx.age || (lang === 'he' ? 'לא צוין' : 'Not specified')}
- ${purpose}: ${ctx.purpose || (lang === 'he' ? 'לא צוין' : 'Not specified')}`;
  }

  /**
   * Format analysis information for context
   */
  private formatAnalysisInfo(
    sessionContext: FuturegraphSessionContext,
    lang: SupportedLanguage,
  ): string {
    const analysis: FuturegraphAnalysis = sessionContext.analysis;
    const report: FuturegraphReport = sessionContext.report;
    
    // Create a comprehensive but structured summary of the analysis
    const sections: string[] = [];
    
    // Executive Summary
    if (report.executiveSummary) {
      sections.push(`${lang === 'he' ? 'סיכום מנהלים' : 'Executive Summary'}:
${report.executiveSummary}`);
    }
    
    // Core Identity
    if (analysis.coreIdentity) {
      const identity = analysis.coreIdentity;
      sections.push(`${lang === 'he' ? 'זהות מרכזית' : 'Core Identity'}:
- ${lang === 'he' ? 'שם' : 'Name'}: ${identity.name || ''}
- ${lang === 'he' ? 'נרטיב' : 'Narrative'}: ${identity.narrative || ''}
- ${lang === 'he' ? 'ניתוח קליני' : 'Clinical Analysis'}: ${identity.clinicalAnalysis || ''}`);
    }
    
    // Personality Layers (summarized)
    if (analysis.personalityLayers) {
      const layers = analysis.personalityLayers;
      const layerSummary: string[] = [];
      
      (['visible', 'conscious', 'subconscious', 'hidden'] as const).forEach(layer => {
        if (layers[layer]?.insights?.length > 0) {
          layerSummary.push(`${layer}: ${layers[layer].insights.join(', ')}`);
        }
      });
      
      if (layerSummary.length > 0) {
        sections.push(`${lang === 'he' ? 'שכבות אישיות' : 'Personality Layers'}:
${layerSummary.join('\n')}`);
      }
    }
    
    // Defense Mechanisms
    if (analysis.defenceMechanisms?.primaryMask) {
      const mask = analysis.defenceMechanisms.primaryMask;
      sections.push(`${lang === 'he' ? 'מנגנוני הגנה' : 'Defense Mechanisms'}:
- ${lang === 'he' ? 'מסכה ראשית' : 'Primary Mask'}: ${mask.type} - ${mask.description}`);
    }
    
    // Internal Contracts
    if (analysis.internalContracts?.contracts?.length > 0) {
      const contracts = analysis.internalContracts.contracts
        .map(c => `- ${c.name}: ${c.description}`)
        .join('\n');
      sections.push(`${lang === 'he' ? 'חוזים פנימיים' : 'Internal Contracts'}:
${contracts}`);
    }
    
    // Capabilities
    if (analysis.intellectualEmotionalSocialCapabilities?.summary) {
      sections.push(`${lang === 'he' ? 'יכולות' : 'Capabilities'}:
${analysis.intellectualEmotionalSocialCapabilities.summary}`);
    }
    
    // Limiting Beliefs
    if (analysis.limitingBeliefs?.coreBelief) {
      sections.push(`${lang === 'he' ? 'אמונות מגבילות' : 'Limiting Beliefs'}:
${analysis.limitingBeliefs.coreBelief}`);
    }
    
    // Therapeutic Recommendations
    if (analysis.treatmentRecommendations?.length > 0) {
      const recs = analysis.treatmentRecommendations.join('\n- ');
      sections.push(`${lang === 'he' ? 'המלצות טיפוליות' : 'Treatment Recommendations'}:
- ${recs}`);
    }
    
    // Include full analysis JSON as well for complete context
    sections.push(`${lang === 'he' ? 'נתוני ניתוח מלאים' : 'Full Analysis Data'}:
${JSON.stringify(analysis, null, 2)}`);
    
    return sections.join('\n\n');
  }
}