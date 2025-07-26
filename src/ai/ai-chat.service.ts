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
        model: 'gpt-4.1-mini',
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
      
      const responseContent = completion.choices[0]?.message?.content;
      
      if (!responseContent) {
        console.warn('OpenAI returned empty response');
        return 'I apologize, but I could not generate a response. Please try again.';
      }
      
      return responseContent;
    } catch (error) {
      console.error('Error in AI chat:', error);
      
      // Check if it's an OpenAI API error with specific details
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        
        // You might want to handle specific OpenAI errors differently
        if (error.message.includes('rate limit')) {
          return 'I apologize, but the service is currently experiencing high demand. Please try again in a moment.';
        }
        
        if (error.message.includes('API key')) {
          console.error('OpenAI API key issue detected');
          return 'I apologize, but there seems to be a configuration issue. Please contact support.';
        }
      }
      
      // Return a user-friendly message instead of throwing
      return 'I apologize, but I encountered an issue while processing your request. Please try again.';
    }
  }
}