// Service providing a simple conversational interface with OpenAI GPT‑4.
// This is used for generic therapist assistance unrelated to the
// FutureGraph analysis flow.
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import OpenAI from 'openai';

@Injectable()
export class AiChatService {
  private readonly openai: OpenAI;
  constructor(private readonly configService: ConfigService) {
    this.openai = new OpenAI({
      apiKey: this.configService.get<string>('OPENAI_API_KEY'),
    });
  }

  /**
   * Generate a chat response given a user message.  Provides a
   * therapeutic context to the system prompt to ensure ethical and
   * supportive answers.
   */
  async getChatResponse(message: string): Promise<string> {
    try {
      const completion = await this.openai.chat.completions.create({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content:
              'You are a helpful AI assistant for therapists. Provide professional, ethical, and supportive responses.',
          },
          {
            role: 'user',
            content: message,
          },
        ],
        temperature: 0.7,
        max_tokens: 500,
      });
      return (
        (completion.choices[0].message.content as string) ||
        'I apologize, but I could not generate a response.'
      );
    } catch (error) {
      console.error('Error in AI chat:', error);
      throw new Error('Failed to get AI response');
    }
  }
}
