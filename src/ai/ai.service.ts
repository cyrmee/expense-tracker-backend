import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';

@Injectable()
export class AiService {
  private readonly genAI: GoogleGenAI;
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.configService.get<string>('GEMINI_API_KEY');
    if (!apiKey) {
      this.logger.warn('GEMINI_API_KEY not set in environment variables');
    }
    this.genAI = new GoogleGenAI({ apiKey });
  }

  /**
   * Parses a natural language expense description into structured data
   */
  async parseExpenseText(text: string): Promise<{
    amount: number;
    date: Date;
    notes?: string;
    categoryId: string;
    moneySourceId: string;
  }> {
    try {
      const [categories, moneySources] = await Promise.all([
        this.prisma.category.findMany({}),
        this.prisma.moneySource.findMany({}),
      ]);

      // Format categories and money sources for the AI prompt
      const categoryInfo = categories
        .map((c) => `${c.name} (id: ${c.id})`)
        .join(', ');
      const moneySourceInfo = moneySources
        .map((m) => `${m.name} (id: ${m.id})`)
        .join(', ');

      // Find default money source
      const defaultMoneySource =
        moneySources.find((ms) => ms.isDefault) || moneySources[0];

      // Create the prompt for Gemini
      const prompt = `
Parse this expense description: "${text}"

Extract the following information:
1. Amount (number)
2. Date (ISO format or relative like 'yesterday', 'last Friday', etc.)
3. Category ID that best matches (from options below)
4. Money source ID that best matches (from options below)
5. Additional notes

Available categories: ${categoryInfo}
Available money sources: ${moneySourceInfo}

Return only a JSON object with these fields:
{
  "amount": number,
  "date": "date string",
  "categoryId": "string",
  "moneySourceId": "string",
  "notes": "string"
}

Ensure the response is a valid JSON object. If any information is missing, use null for the corresponding field.`;

      // Call Gemini API
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.1,
          maxOutputTokens: 1000,
        },
      });

      // Attempt to parse the JSON response
      if (!result.text) {
        throw new Error('AI response did not return any text');
      }

      // Remove markdown code fences if present
      let responseText = result.text.trim();
      if (responseText.startsWith('```json')) {
        responseText = responseText.substring(7);
      }
      if (responseText.endsWith('```')) {
        responseText = responseText.slice(0, -3);
      }
      responseText = responseText.trim();

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
        this.logger.error(
          `Failed to parse JSON response: ${parseError.message}, Response Text: ${responseText}`,
        );
        throw new Error(`Failed to parse AI response: Invalid JSON format`);
      }

      // Process the date
      const date = this.parseDate(parsedResponse.date);

      // If no money source was specified, use default
      if (!parsedResponse.moneySourceId && defaultMoneySource) {
        parsedResponse.moneySourceId = defaultMoneySource.id;
      }

      return {
        amount: Number(parsedResponse.amount),
        date,
        notes: parsedResponse.notes,
        categoryId: parsedResponse.categoryId,
        moneySourceId: parsedResponse.moneySourceId,
      };
    } catch (error) {
      this.logger.error(`Failed to parse expense text: ${error.message}`);
      throw new Error(`Failed to parse expense: ${error.message}`);
    }
  }

  /**
   * Parse various date formats into a Date object
   */
  private parseDate(dateStr: string): Date {
    if (!dateStr) return new Date();

    // Handle relative dates
    const now = new Date();
    const lowerDateStr = dateStr.toLowerCase();

    if (lowerDateStr === 'today') {
      return now;
    }
    if (lowerDateStr === 'yesterday') {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return yesterday;
    }
    if (lowerDateStr.includes('last week')) {
      const lastWeek = new Date(now);
      lastWeek.setDate(now.getDate() - 7);
      return lastWeek;
    }

    // Try standard date parsing
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Default to current date
    return new Date();
  }

  /**
   * Suggest a category based on expense description
   */
  async suggestCategory(description: string): Promise<string> {
    try {
      const result = await this.genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: `Based on this expense description: "${description}", what category would it likely belong to? Respond with only the category name, nothing else.`,
              },
            ],
          },
        ],
        config: {
          temperature: 0.1,
          maxOutputTokens: 10,
        },
      });

      return result.text ?? '';
    } catch (error) {
      this.logger.error(`Failed to suggest category: ${error.message}`);
      return 'other';
    }
  }
}
