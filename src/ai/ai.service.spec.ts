import { GoogleGenAI } from '@google/genai';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { PrismaService } from '../prisma/prisma.service';
import { AiService } from './ai.service';

jest.mock('@google/genai', () => ({
    GoogleGenAI: jest.fn(),
}));

describe('AiService', () => {
    const MockedGoogleGenAI = GoogleGenAI as unknown as jest.Mock;

    const makeService = (overrides?: {
        prisma?: Partial<PrismaService>;
        appSettings?: Partial<AppSettingsService>;
        config?: Partial<ConfigService>;
        generateContent?: jest.Mock;
    }) => {
        const prisma: any = {
            category: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
            moneySource: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
            },
            ...overrides?.prisma,
        };

        const appSettingsService: any = {
            getGeminiApiKey: jest.fn(),
            ...overrides?.appSettings,
        };

        const configService: any = {
            get: jest.fn(),
            ...overrides?.config,
        };

        const generateContent = overrides?.generateContent ?? jest.fn();
        MockedGoogleGenAI.mockImplementation(() => ({
            models: { generateContent },
        }));

        const service = new AiService(
            prisma as PrismaService,
            appSettingsService as AppSettingsService,
            configService as ConfigService,
        );

        return { service, prisma, appSettingsService, configService, generateContent };
    };

    beforeEach(() => {
        jest.clearAllMocks();
        jest.useRealTimers();
    });

    describe('parseExpenseData', () => {
        it('throws UnauthorizedException when no user key and no global key', async () => {
            const { service, appSettingsService, configService } = makeService();

            appSettingsService.getGeminiApiKey.mockResolvedValue(null);
            configService.get.mockImplementation((key: string) => {
                if (key === 'GEMINI_API_KEY') return undefined;
                if (key === 'GEMINI_MODEL') return 'gemini-test';
                return undefined;
            });

            await expect(service.parseExpenseData('coffee 5', 'u1')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('parses fenced JSON, fills default moneySourceId, and suggests category when invalid', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

            const generateContent = jest
                .fn()
                // First call: parsed expense
                .mockResolvedValueOnce({
                    text: '```json\n{"amount": 10, "date": "2025-01-10", "categoryId": "invalid", "moneySourceId": null, "notes": "Lunch"}\n```',
                })
                // Second call: category suggestion
                .mockResolvedValueOnce({ text: 'cat-2' });

            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockImplementation((key: string) => {
                if (key === 'GEMINI_MODEL') return 'gemini-test';
                if (key === 'GEMINI_API_KEY') return undefined;
                return undefined;
            });

            prisma.category.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'Food', isDefault: true },
                { id: 'cat-2', name: 'Transport', isDefault: false },
            ]);
            prisma.moneySource.findMany.mockResolvedValue([
                { id: 'ms-1', name: 'Cash', isDefault: false },
                { id: 'ms-2', name: 'Card', isDefault: true },
            ]);
            prisma.category.findUnique.mockResolvedValue({ id: 'cat-2', name: 'Transport' });
            prisma.moneySource.findUnique.mockResolvedValue({ id: 'ms-2', name: 'Card' });

            const result = await service.parseExpenseData('lunch 10', 'u1');

            expect(generateContent).toHaveBeenCalledTimes(2);
            expect(result.amount).toBe(10);
            expect(result.categoryId).toBe('cat-2');
            expect(result.moneySourceId).toBe('ms-2');
            expect(result.date.toISOString()).toContain('2025-01-10');
        });

        it('uses global API key when user key is missing', async () => {
            const generateContent = jest.fn().mockResolvedValue({
                text: '{"amount": 1, "date": "2025-01-10", "categoryId": "cat-1", "moneySourceId": "ms-1", "notes": "x"}',
            });

            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue(null);
            configService.get.mockImplementation((key: string) => {
                if (key === 'GEMINI_API_KEY') return 'global';
                if (key === 'GEMINI_MODEL') return undefined;
                return undefined;
            });

            prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Food', isDefault: true }]);
            prisma.moneySource.findMany.mockResolvedValue([{ id: 'ms-1', name: 'Cash', isDefault: true }]);
            prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
            prisma.moneySource.findUnique.mockResolvedValue({ id: 'ms-1' });

            await expect(service.parseExpenseData('x', 'u1')).resolves.toEqual(
                expect.objectContaining({ categoryId: 'cat-1', moneySourceId: 'ms-1' }),
            );
        });

        it('throws when AI returns no text', async () => {
            const generateContent = jest.fn().mockResolvedValue({ text: '' });
            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockReturnValue('gemini-test');
            prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Food', isDefault: true }]);
            prisma.moneySource.findMany.mockResolvedValue([{ id: 'ms-1', name: 'Cash', isDefault: true }]);

            await expect(service.parseExpenseData('x', 'u1')).rejects.toThrow('Failed to parse expense');
        });

        it('wraps JSON parse errors', async () => {
            const generateContent = jest.fn().mockResolvedValue({ text: '{not-json' });
            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockReturnValue('gemini-test');
            prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Food', isDefault: true }]);
            prisma.moneySource.findMany.mockResolvedValue([{ id: 'ms-1', name: 'Cash', isDefault: true }]);

            await expect(service.parseExpenseData('x', 'u1')).rejects.toThrow(
                'Failed to parse expense',
            );
        });

        it('throws when no money sources are available', async () => {
            const generateContent = jest.fn().mockResolvedValue({
                text: '{"amount": 1, "date": null, "categoryId": "cat-1", "moneySourceId": null, "notes": null}',
            });
            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockReturnValue('gemini-test');
            prisma.category.findMany.mockResolvedValue([{ id: 'cat-1', name: 'Food', isDefault: true }]);
            prisma.moneySource.findMany.mockResolvedValue([]);

            await expect(service.parseExpenseData('x', 'u1')).rejects.toThrow(
                'No money sources available',
            );
        });

        it('throws when no categories are available for categorization', async () => {
            const generateContent = jest.fn().mockResolvedValue({
                text: '{"amount": 1, "date": "bad-date", "categoryId": null, "moneySourceId": "ms-1", "notes": "x"}',
            });
            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockReturnValue('gemini-test');
            prisma.category.findMany.mockResolvedValue([]);
            prisma.moneySource.findMany.mockResolvedValue([{ id: 'ms-1', name: 'Cash', isDefault: true }]);

            await expect(service.parseExpenseData('x', 'u1')).rejects.toThrow(
                'No categories available',
            );
        });

        it('matches suggested category by name and defaults when no match found', async () => {
            jest.useFakeTimers().setSystemTime(new Date('2025-01-15T12:00:00.000Z'));

            const generateContent = jest
                .fn()
                .mockResolvedValueOnce({
                    text: '{"amount": 10, "date": "not-a-date", "categoryId": "", "moneySourceId": null, "notes": "Lunch"}',
                })
                .mockResolvedValueOnce({ text: 'Transport' });

            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockReturnValue('gemini-test');

            prisma.category.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'Food', isDefault: true },
                { id: 'cat-2', name: 'Transport', isDefault: false },
            ]);
            prisma.moneySource.findMany.mockResolvedValue([{ id: 'ms-1', name: 'Cash', isDefault: true }]);
            prisma.category.findUnique.mockResolvedValue({ id: 'cat-2' });
            prisma.moneySource.findUnique.mockResolvedValue({ id: 'ms-1' });

            const result = await service.parseExpenseData('lunch 10', 'u1');
            expect(result.categoryId).toBe('cat-2');
            expect(result.date).toBeInstanceOf(Date);

            // now suggest something unmatchable -> defaults to first category
            generateContent.mockResolvedValueOnce({
                text: '{"amount": 10, "date": null, "categoryId": null, "moneySourceId": null, "notes": "Lunch"}',
            });
            generateContent.mockResolvedValueOnce({ text: 'unknown' });

            const result2 = await service.parseExpenseData('lunch 10', 'u1');
            expect(result2.categoryId).toBe('cat-1');
        });

        it('defaults to first category when category suggestion has no text', async () => {
            const generateContent = jest
                .fn()
                .mockResolvedValueOnce({
                    text: '{"amount": 10, "date": "2025-01-10", "categoryId": "invalid", "moneySourceId": "ms-1", "notes": "Lunch"}',
                })
                .mockResolvedValueOnce({} as any);

            const { service, prisma, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockReturnValue('gemini-test');

            prisma.category.findMany.mockResolvedValue([
                { id: 'cat-1', name: 'Food', isDefault: true },
                { id: 'cat-2', name: 'Transport', isDefault: false },
            ]);
            prisma.moneySource.findMany.mockResolvedValue([
                { id: 'ms-1', name: 'Cash', isDefault: true },
            ]);

            prisma.category.findUnique.mockResolvedValue({ id: 'cat-1' });
            prisma.moneySource.findUnique.mockResolvedValue({ id: 'ms-1' });

            const result = await service.parseExpenseData('lunch 10', 'u1');
            expect(result.categoryId).toBe('cat-1');
        });
    });

    describe('generateUserInsights', () => {
        it('returns fallback text when model returns empty', async () => {
            const generateContent = jest.fn().mockResolvedValue({ text: '' });
            const { service, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockImplementation((key: string) => {
                if (key === 'GEMINI_MODEL') return 'gemini-test';
                return undefined;
            });

            const res = await service.generateUserInsights('u1', {
                categoryComparisons: [],
                overallDifferencePercentage: 0,
                userMonthlySpending: 0,
                averageMonthlySpending: 0,
                comparisonUserCount: 1,
                currency: 'USD',
            });

            expect(res).toBe('Unable to generate spending insights at this time.');
        });

        it('returns a specific message when unauthorized (no configured keys)', async () => {
            const { service, appSettingsService, configService } = makeService();

            appSettingsService.getGeminiApiKey.mockResolvedValue(null);
            configService.get.mockImplementation((key: string) => {
                if (key === 'GEMINI_API_KEY') return undefined;
                if (key === 'GEMINI_MODEL') return 'gemini-test';
                return undefined;
            });

            const res = await service.generateUserInsights('u1', {
                categoryComparisons: [],
                overallDifferencePercentage: 0,
                userMonthlySpending: 0,
                averageMonthlySpending: 0,
                comparisonUserCount: 1,
                currency: 'USD',
            });

            expect(res).toContain('AI-powered insights unavailable');
        });

        it('returns trimmed AI output on success and returns generic message on other errors', async () => {
            const generateContent = jest
                .fn()
                .mockResolvedValueOnce({ text: '  Hello  ' })
                .mockRejectedValueOnce(new Error('boom'));

            const { service, appSettingsService, configService } = makeService({
                generateContent,
            });

            appSettingsService.getGeminiApiKey.mockResolvedValue('user-key');
            configService.get.mockImplementation((key: string) => {
                if (key === 'GEMINI_MODEL') return 'gemini-test';
                return undefined;
            });

            await expect(
                service.generateUserInsights('u1', {
                    categoryComparisons: [],
                    overallDifferencePercentage: 0,
                    userMonthlySpending: 0,
                    averageMonthlySpending: 0,
                    comparisonUserCount: 1,
                    currency: 'USD',
                }),
            ).resolves.toBe('Hello');

            await expect(
                service.generateUserInsights('u1', {
                    categoryComparisons: [],
                    overallDifferencePercentage: 0,
                    userMonthlySpending: 0,
                    averageMonthlySpending: 0,
                    comparisonUserCount: 1,
                    currency: 'USD',
                }),
            ).resolves.toContain('Unable to generate spending insights');
        });
    });

    describe('isAIAvailableForUser', () => {
        it('returns true when user has API key', async () => {
            const { service, appSettingsService } = makeService();
            appSettingsService.getGeminiApiKey.mockResolvedValue('key');
            await expect(service.isAIAvailableForUser('u1')).resolves.toBe(true);
        });

        it('returns false when AppSettingsService errors', async () => {
            const { service, appSettingsService } = makeService();
            appSettingsService.getGeminiApiKey.mockRejectedValue(new Error('fail'));
            await expect(service.isAIAvailableForUser('u1')).resolves.toBe(false);
        });
    });
});
