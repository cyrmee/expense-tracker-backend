import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleGenAI } from '@google/genai';
import { ParsedExpenseDto } from '../expenses/dto';

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
  async parseExpenseData(
    text: string,
    userId: string,
  ): Promise<ParsedExpenseDto> {
    try {
      const [categories, moneySources] = await Promise.all([
        this.prisma.category.findMany({
          where: { OR: [{ userId }, { isDefault: true }] },
          orderBy: { createdAt: 'asc' },
        }),
        this.prisma.moneySource.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
        }),
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

      // Get current date and format it as YYYY-MM-DD
      const today = new Date();
      const formattedToday = today.toISOString().split('T')[0]; // Gets 'YYYY-MM-DD' part

      // Create the prompt for Gemini
      const prompt = `
Parse this expense description: "${text}"

Today's date is ${formattedToday}.

Extract the following information:
1. Amount (number)
2. Date - If a specific date is mentioned (like "April 10"), convert it to ISO format YYYY-MM-DD (e.g., 2025-04-10).
   If a relative date is mentioned (like "yesterday", "last Friday"), convert it to the actual date in ISO format based on today being ${formattedToday}.
   If no date is mentioned, use today's date (${formattedToday}).
3. Category ID that best matches (from options below)
4. Money source ID that best matches (from options below)
5. Additional notes

Available categories: ${categoryInfo}
Available money sources: ${moneySourceInfo}

Important: First translate the original expense description to English if it is not already in English.
Also ensure that any notes you generate are always in English regardless of the input language.

Return only a JSON object with these fields:
{
  "amount": number,
  "date": "YYYY-MM-DD",  // Must be in ISO format YYYY-MM-DD
  "categoryId": "string",
  "moneySourceId": "string",
  "notes": "string"    // Must be in English
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

      // If no category was specified or the category isn't valid, suggest one
      if (
        !parsedResponse.categoryId ||
        !categories.some((c) => c.id === parsedResponse.categoryId)
      ) {
        // Suggest a category based on the notes or the original text
        const descriptionForCategorization = parsedResponse.notes || text;

        const categoryResult = await this.genAI.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: [
            {
              role: 'user',
              parts: [
                {
                  text: `Based on this expense description: "${descriptionForCategorization}", which of these categories would it likely belong to? Respond only with the category ID.
                  Available categories: ${categoryInfo}`,
                },
              ],
            },
          ],
          config: {
            temperature: 0.1,
            maxOutputTokens: 10,
          },
        });

        const suggestedCategory = categoryResult.text?.trim() || '';

        // Try to find the category by ID or by name
        let matchedCategory = categories.find(
          (c) => c.id === suggestedCategory,
        );

        if (!matchedCategory) {
          // Try to match by name if ID match fails
          matchedCategory = categories.find(
            (c) => c.name.toLowerCase() === suggestedCategory.toLowerCase(),
          );
        }

        if (matchedCategory) {
          parsedResponse.categoryId = matchedCategory.id;
        } else if (categories.length > 0) {
          // Default to the first category if we still can't find a match
          parsedResponse.categoryId = categories[0].id;
        }
      }

      return {
        amount: Number(parsedResponse.amount),
        date: date,
        notes: parsedResponse.notes,
        categoryId: parsedResponse.categoryId,
        category: await this.prisma.category.findUnique({
          where: { id: parsedResponse.categoryId },
        }),
        moneySourceId: parsedResponse.moneySourceId,
        moneySource: await this.prisma.moneySource.findUnique({
          where: { id: parsedResponse.moneySourceId },
        }),
      } as ParsedExpenseDto;
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

    // Try parsing the date string directly
    const parsedDate = new Date(dateStr);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // If parsing fails, return current date
    this.logger.warn(`Could not parse date: "${dateStr}", using current date`);
    return new Date();
  }
}
