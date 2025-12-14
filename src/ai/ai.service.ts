import { GoogleGenAI } from '@google/genai';
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { ParsedExpenseDto } from '../expenses/dto';
import { PrismaService } from '../prisma/prisma.service';
import { CategoryComparisonDto } from '../user-insights/dto';

@Injectable()
export class AiService {
  private readonly _logger = new Logger(AiService.name);
  constructor(
    private readonly prisma: PrismaService,
    private readonly appSettingsService: AppSettingsService,
    private readonly configService: ConfigService,
  ) { }

  /**
   * Get the Gemini model name from environment variable or default
   */
  private getModel(): string {
    return this.configService.get<string>('GEMINI_MODEL') || 'gemini-2.5-flash';
  }

  /**
   * Initialize a GoogleGenAI instance with user's API key
   * @param userId The user ID to get the API key for
   * @throws UnauthorizedException if the user doesn't have a configured API key
   * @returns A GoogleGenAI instance initialized with the user's API key
   */
  private async initializeGenAIForUser(userId: string): Promise<GoogleGenAI> {
    let apiKey = await this.appSettingsService.getGeminiApiKey(userId);
    this._logger.log(`User ${userId} API key: ${apiKey}`);
    // If user key not found, try the global key
    if (!apiKey) {
      const globalApiKey = this.configService.get<string>('GEMINI_API_KEY');
      this._logger.log(`Global API key: ${globalApiKey}`);
      apiKey = globalApiKey ?? null; // Convert undefined to null
      // If the global key is ALSO not found (i.e., apiKey is still null),
      // throw an error immediately as the fallback mechanism failed due to missing configuration.
      if (!apiKey) {
        // Throwing UnauthorizedException might imply the *user* is unauthorized,
        // but it's actually a server config issue. However, to maintain consistency
        // with the existing error handling, we use it but with a specific message.
        throw new UnauthorizedException(
          'AI features are unavailable due to missing configuration. Please contact the administrator.',
        );
      }
    }

    return new GoogleGenAI({ apiKey });
  }

  /**
   * Parses a natural language expense description into structured data
   */
  async parseExpenseData(
    text: string,
    userId: string,
  ): Promise<ParsedExpenseDto> {
    try {
      // Initialize AI client with user's API key
      const genAI = await this.initializeGenAIForUser(userId);

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
      const result = await genAI.models.generateContent({
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
      responseText = responseText
        .replace(/^```(?:json)?\n?([\s\S]*?)\n?```$/g, '$1')
        .trim();

      let parsedResponse;
      try {
        parsedResponse = JSON.parse(responseText);
      } catch (parseError) {
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

        const categoryResult = await genAI.models.generateContent({
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
      // Propagate specific UnauthorizedException for API key issues
      if (error instanceof UnauthorizedException) {
        throw error;
      }

      throw new Error(`Failed to parse expense: ${error.message}`);
    }
  }

  /**
   * Create a single AI‑powered narrative for a spending insights.
   */
  async generateUserInsights(
    userId: string,
    params: {
      categoryComparisons: CategoryComparisonDto[];
      overallDifferencePercentage: number;
      userMonthlySpending: number;
      averageMonthlySpending: number;
      comparisonUserCount: number;
      currency: string;
    },
  ): Promise<string> {
    try {
      // Initialize AI client with user's API key
      const genAI = await this.initializeGenAIForUser(userId);

      // Build a prompt for the AI
      const prompt = `
Analyze these spending metrics:
• User spent: ${params.userMonthlySpending} ${params.currency}  
• Average user spent: ${params.averageMonthlySpending} ${params.currency}  
• Difference: ${params.overallDifferencePercentage}% 
• Based on: ${params.comparisonUserCount} users
• Categories: ${JSON.stringify(params.categoryComparisons)}

Write directly as a financial advisor with:
• An attention-grabbing headline
• 3 points on overspending areas with tough love and witty observations
• 2 points acknowledging good financial restraint
• 3 practical financial recommendations with direct, honest advice (focus on actions the user can take within this app - do NOT suggest using other budgeting apps)
• A memorable conclusion about financial consequences

Balance your tone based on spending patterns. Format as bullet points. Start directly with the headline - don't use introductory phrases like "Here's an analysis".
`;

      const result = await genAI.models.generateContent({
        model: 'gemini-2.0-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        config: {
          temperature: 0.8, // Slightly higher for more creativity
          maxOutputTokens: 2000,
        },
      });

      if (!result.text) {
        this._logger.log(`Result: ${result}`);
        this._logger.warn('AI-generated insights are empty');
        return 'Unable to generate spending insights at this time.';
      }

      return result.text.trim();
    } catch (error) {
      // Propagate specific UnauthorizedException for API key issues
      if (error instanceof UnauthorizedException) {
        return `AI-powered insights unavailable: ${error.message}`;
      }

      return 'Unable to generate spending insights at this time. Please clear your API key in settings or set a correct one.';
    }
  }

  /**
   * Checks if AI features are available for a user
   * @returns true if the user has a configured API key, false otherwise
   */
  async isAIAvailableForUser(userId: string): Promise<boolean> {
    try {
      const apiKey = await this.appSettingsService.getGeminiApiKey(userId);
      return !!apiKey;
    } catch (error) {
      return false;
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
    return new Date();
  }
}
