// Service providing a simple conversational interface with OpenAI GPT‑4.
//
// This implementation has been extended with optional localisation.  When
// a language code is provided to `getChatResponse` it will tailor the
// system prompt accordingly and translate fallback messages.  Currently
// English ("en") and Hebrew ("he") are supported; other values fall
// back to English.

import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';
import { LanguageService, SupportedLanguage } from '../common/language.service';

@Injectable()
export class AiChatService {
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
   * Generate a chat response given a user message.  Provides a
   * therapeutic context to the system prompt to ensure ethical and
   * supportive answers.  The optional language parameter allows the
   * caller to request Hebrew responses.  When unspecified or invalid
   * English is used.
   */
  async getChatResponse(
    message: string,
    language?: string,
  ): Promise<string> {
    const lang: SupportedLanguage = this.languageService.validate(language);
    // Localise the system prompt; Hebrew instructs the model to respond in Hebrew
    const systemPrompt =
      lang === 'he'
        ? 'אתה עוזר AI למטפלים. ספק תשובות מקצועיות, אתיות ותומכות. השב בעברית.'
        : 'You are a helpful AI assistant for therapists. Provide professional, ethical, and supportive responses.';
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      const responseContent = completion.choices[0]?.message?.content;
      if (!responseContent) {
        console.warn('OpenAI returned empty response');
        return lang === 'he'
          ? 'אני מתנצל, לא הצלחתי ליצור תשובה. אנא נסה שוב.'
          : 'I apologize, but I could not generate a response. Please try again.';
      }
      return responseContent.trim();
    } catch (error: any) {
      console.error('Error in AI chat:', error);
      // Extract error message if available
      const messageText: string =
        error instanceof Error ? error.message : String(error);
      if (messageText.includes('rate limit')) {
        return lang === 'he'
          ? 'אני מתנצל, השירות כרגע חווה עומס גבוה. נסה שוב בעוד רגע.'
          : 'I apologize, but the service is currently experiencing high demand. Please try again in a moment.';
      }
      if (messageText.includes('API key')) {
        console.error('OpenAI API key issue detected');
        return lang === 'he'
          ? 'אני מתנצל, נראה שיש בעיית תצורה. אנא פנה לתמיכה.'
          : 'I apologize, but there seems to be a configuration issue. Please contact support.';
      }
      return lang === 'he'
        ? 'אני מתנצל, אירעה תקלה בעת עיבוד הבקשה. אנא נסה שוב.'
        : 'I apologize, but I encountered an issue while processing your request. Please try again.';
    }
  }
}