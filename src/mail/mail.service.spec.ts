import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

const sendMock = jest.fn();

jest.mock('resend', () => {
    return {
        Resend: jest.fn().mockImplementation(() => ({
            emails: {
                send: sendMock,
            },
        })),
    };
});

describe('MailService', () => {
    const makeConfig = (overrides?: Record<string, any>) => {
        const values: Record<string, any> = {
            FRONTEND_URL: 'https://frontend.example',
            FROM_EMAIL: 'from@example.com',
            ...overrides,
        };
        return {
            get: jest.fn((key: string) => values[key]),
        } as unknown as ConfigService;
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('sendResetPasswordToken sends email and throws on resend error', async () => {
        const service = new MailService('key', makeConfig());

        sendMock.mockResolvedValueOnce({ error: null });
        await expect(service.sendResetPasswordToken('to@example.com', 'token')).resolves.toBeUndefined();

        sendMock.mockResolvedValueOnce({ error: { message: 'nope' } });
        await expect(service.sendResetPasswordToken('to@example.com', 'token')).rejects.toThrow(
            'Failed to send email: nope',
        );
    });

    it('sendOTP sends email and throws on resend error', async () => {
        const service = new MailService('key', makeConfig({ FROM_EMAIL: undefined }));

        sendMock.mockResolvedValueOnce({ error: null });
        await expect(service.sendOTP('to@example.com', '123456')).resolves.toBeUndefined();

        sendMock.mockResolvedValueOnce({ error: { message: 'nope' } });
        await expect(service.sendOTP('to@example.com', '123456')).rejects.toThrow(
            'Failed to send email: nope',
        );
    });
});
