import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AppSettingsService } from '../app-settings/app-settings.service';
import { CryptoService } from '../common/crypto.service';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

jest.mock('argon2');

describe('AuthService', () => {
    const makeService = (overrides?: {
        prisma?: Partial<PrismaService>;
        redisClient?: any;
        jwtService?: Partial<JwtService>;
        config?: Partial<ConfigService>;
        appSettingsService?: Partial<AppSettingsService>;
        mailService?: Partial<MailService>;
        cryptoService?: Partial<CryptoService>;
    }) => {
        const prisma: any = {
            user: {
                findUnique: jest.fn(),
                findFirst: jest.fn(),
                create: jest.fn(),
                update: jest.fn(),
            },
            ...overrides?.prisma,
        };

        const redisClient: any =
            overrides?.redisClient ??
            ({
                get: jest.fn(),
                del: jest.fn(),
                keys: jest.fn(),
            } as any);

        const configService: any = {
            get: jest.fn((key: string) => {
                if (key === 'JWT_ACCESS_EXPIRATION') return '15m';
                if (key === 'JWT_REFRESH_EXPIRATION') return '7d';
                return undefined;
            }),
            ...overrides?.config,
        };
        const appSettingsService: any = {
            create: jest.fn(),
            ...overrides?.appSettingsService,
        };
        const mailService: any = {
            sendOTP: jest.fn(),
            sendResetPasswordToken: jest.fn(),
            ...overrides?.mailService,
        };
        const cryptoService: any = {
            generateRandomToken: jest.fn(async () => 'rand'),
            ...overrides?.cryptoService,
        };

        const jwtService: any =
            overrides?.jwtService ??
            ({
                decode: jest.fn(),
                verify: jest.fn(),
                sign: jest.fn(() => 'signed'),
            } as any);

        const service = new AuthService(
            prisma as PrismaService,
            redisClient,
            configService,
            appSettingsService,
            mailService,
            cryptoService,
            jwtService as JwtService,
        );

        return { service, prisma, redisClient, jwtService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('logout', () => {
        it('deletes refresh jti key when refresh token includes jti', async () => {
            const { service, redisClient, jwtService } = makeService();

            jwtService.decode.mockReturnValue({ sub: 'user-1', jti: 'jti-1' });
            redisClient.keys
                .mockResolvedValueOnce([]) // jwt_jti:* 
                .mockResolvedValueOnce([]); // refresh_jti:*

            await expect(service.logout('refresh-token')).resolves.toEqual({
                message: 'Logged out successfully',
            });

            expect(redisClient.del).toHaveBeenCalledWith('refresh_jti:user-1:jti-1');
        });

        it('deletes all jwt/refresh jti keys for user id', async () => {
            const { service, redisClient } = makeService();

            redisClient.keys
                .mockResolvedValueOnce(['jwt_jti:user-2:a', 'jwt_jti:user-2:b'])
                .mockResolvedValueOnce(['refresh_jti:user-2:c']);

            await service.logout(undefined, 'user-2');

            expect(redisClient.del).toHaveBeenCalledWith([
                'jwt_jti:user-2:a',
                'jwt_jti:user-2:b',
            ]);
            expect(redisClient.del).toHaveBeenCalledWith(['refresh_jti:user-2:c']);
        });
    });

    describe('validateUser', () => {
        it('returns user without hash on success', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1',
                email: 'e',
                hash: 'h',
                name: 'n',
            });
            (argon2.verify as any).mockResolvedValue(true);

            await expect(service.validateUser('e', 'p')).resolves.toEqual({
                id: 'u1',
                email: 'e',
                name: 'n',
            });
        });

        it('returns null when user missing or password mismatch', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(service.validateUser('e', 'p')).resolves.toBeNull();

            prisma.user.findUnique.mockResolvedValue({ id: 'u1', hash: 'h' });
            (argon2.verify as any).mockResolvedValue(false);
            await expect(service.validateUser('e', 'p')).resolves.toBeNull();
        });
    });

    describe('register', () => {
        it('throws if user exists', async () => {
            const { service, prisma } = makeService();
            prisma.user.findFirst.mockResolvedValue({ id: 'existing' });

            await expect(
                service.register({ email: 'a@b.com', name: 'A', password: 'p' } as any),
            ).rejects.toBeInstanceOf(ForbiddenException);
        });

        it('creates user, app settings, requests verification, and returns user dto', async () => {
            const { service, prisma } = makeService();
            prisma.user.findFirst.mockResolvedValue(null);
            (argon2.hash as any).mockResolvedValue('hash');
            prisma.user.create.mockResolvedValue({
                id: 'u1',
                email: 'a@b.com',
                name: 'A',
                isVerified: false,
                isActive: true,
            });
            jest
                .spyOn(service, 'requestEmailVerification')
                .mockResolvedValue(true);

            await expect(
                service.register({ email: 'a@b.com', name: 'A', password: 'p' } as any),
            ).resolves.toEqual({
                id: 'u1',
                email: 'a@b.com',
                name: 'A',
                isVerified: false,
                isActive: true,
            });
        });
    });

    describe('requestEmailVerification', () => {
        it('throws Unauthorized when user not found', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue(null);
            await expect(service.requestEmailVerification('e')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('throws Forbidden when already verified', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue({ id: 'u1', isVerified: true });
            await expect(service.requestEmailVerification('e')).rejects.toBeInstanceOf(
                ForbiddenException,
            );
        });

        it('sends otp when eligible', async () => {
            const { service, prisma, redisClient } = makeService();
            prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'e', isVerified: false });
            redisClient.set = jest.fn();
            const mailServiceSendOtp = (service as any).mailService.sendOTP as jest.Mock;

            jest.spyOn(globalThis.Math, 'random').mockReturnValue(0.123456);
            await expect(service.requestEmailVerification('e')).resolves.toBe(true);
            expect(mailServiceSendOtp).toHaveBeenCalled();
            (globalThis.Math.random as any).mockRestore?.();
        });
    });

    describe('verifyEmailOtp', () => {
        it('throws when otp is invalid', async () => {
            const { service, redisClient } = makeService();
            redisClient.get.mockResolvedValue(null);
            await expect(service.verifyEmailOtp('otp')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('returns tokens and deletes otp key on success', async () => {
            const { service, prisma, redisClient } = makeService();
            redisClient.get.mockResolvedValue('u1');
            prisma.user.update.mockResolvedValue({
                id: 'u1',
                email: 'e',
                name: 'n',
                isVerified: true,
                isActive: true,
            });
            jest.spyOn(service, 'generateAccessToken').mockResolvedValue('a');
            jest.spyOn(service, 'generateRefreshToken').mockResolvedValue('r');

            await expect(service.verifyEmailOtp('otp')).resolves.toEqual({
                user: expect.objectContaining({ id: 'u1' }),
                accessToken: 'a',
                refreshToken: 'r',
            });
            expect(redisClient.del).toHaveBeenCalledWith('email_verification:otp');
        });

        it('wraps unexpected errors as InternalServerErrorException', async () => {
            const { service, prisma, redisClient } = makeService();
            redisClient.get.mockResolvedValue('u1');
            prisma.user.update.mockRejectedValue(new Error('db'));
            await expect(service.verifyEmailOtp('otp')).rejects.toMatchObject({
                name: 'InternalServerErrorException',
            });
        });
    });

    describe('login', () => {
        it('updates lastLoginAt and returns tokens and user payload', async () => {
            const { service, prisma } = makeService();
            prisma.user.update.mockResolvedValue({});
            jest.spyOn(service, 'generateAccessToken').mockResolvedValue('a');
            jest.spyOn(service, 'generateRefreshToken').mockResolvedValue('r');

            await expect(
                service.login({ id: 'u1', email: 'e', name: 'n', isVerified: true, isActive: true }),
            ).resolves.toEqual({
                accessToken: 'a',
                refreshToken: 'r',
                user: { id: 'u1', email: 'e', name: 'n', isVerified: true, isActive: true },
            });
        });
    });

    describe('getUserByToken', () => {
        it('returns null if token cannot be decoded', async () => {
            const { service, jwtService } = makeService();
            jwtService.decode.mockReturnValue(null);

            await expect(service.getUserByToken('bad')).resolves.toBeNull();
        });

        it('returns mapped user when found', async () => {
            const { service, jwtService, prisma } = makeService();

            jwtService.decode.mockReturnValue({ sub: 'user-3' });
            prisma.user.findUnique.mockResolvedValue({
                id: 'user-3',
                email: 'u3@example.com',
                name: 'U3',
                isActive: true,
                isVerified: false,
            });

            await expect(service.getUserByToken('token')).resolves.toEqual({
                id: 'user-3',
                email: 'u3@example.com',
                name: 'U3',
                isActive: true,
                isVerified: false,
            });
        });
    });

    describe('refreshAccessToken', () => {
        it('rejects non-refresh tokens', async () => {
            const { service, jwtService } = makeService();
            jwtService.verify.mockReturnValue({ sub: 'u1', type: 'access', jti: 'j' });
            await expect(service.refreshAccessToken('t')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('rejects missing token record', async () => {
            const { service, jwtService, redisClient } = makeService();
            jwtService.verify.mockReturnValue({ sub: 'u1', type: 'refresh', jti: 'j' });
            redisClient.get.mockResolvedValue(null);
            await expect(service.refreshAccessToken('t')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('returns new tokens when valid', async () => {
            const { service, jwtService, redisClient, prisma } = makeService();
            jwtService.verify.mockReturnValue({ sub: 'u1', type: 'refresh', jti: 'j' });
            redisClient.get.mockResolvedValue('{}');
            prisma.user.findUnique.mockResolvedValue({
                id: 'u1',
                email: 'e',
                name: 'n',
                isActive: true,
                isVerified: true,
            });
            jest.spyOn(service, 'generateAccessToken').mockResolvedValue('a2');
            jest.spyOn(service, 'generateRefreshToken').mockResolvedValue('r2');

            await expect(service.refreshAccessToken('t')).resolves.toEqual({
                accessToken: 'a2',
                refreshToken: 'r2',
                user: expect.objectContaining({ id: 'u1' }),
            });
            expect(redisClient.del).toHaveBeenCalledWith('refresh_jti:u1:j');
        });

        it('wraps non-Unauthorized errors as UnauthorizedException', async () => {
            const { service, jwtService } = makeService();
            jwtService.verify.mockImplementation(() => {
                throw new Error('boom');
            });
            await expect(service.refreshAccessToken('t')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });
    });

    describe('changePassword', () => {
        it('throws when user missing', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue(null);

            await expect(
                service.changePassword('u1', { currentPassword: 'a', newPassword: 'b' } as any),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('throws when current password invalid', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue({ id: 'u1', hash: 'h' });
            (argon2.verify as any).mockResolvedValue(false);

            await expect(
                service.changePassword('u1', { currentPassword: 'a', newPassword: 'b' } as any),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('updates password hash when valid', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue({ id: 'u1', hash: 'h' });
            (argon2.verify as any).mockResolvedValue(true);
            (argon2.hash as any).mockResolvedValue('h2');
            prisma.user.update.mockResolvedValue({});

            await expect(
                service.changePassword('u1', { currentPassword: 'a', newPassword: 'b' } as any),
            ).resolves.toBeUndefined();
        });
    });

    describe('password reset', () => {
        it('requestPasswordReset returns true when user missing', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockResolvedValue(null);
            await expect(service.requestPasswordReset('e')).resolves.toBe(true);
        });

        it('requestPasswordReset stores key and sends mail', async () => {
            const { service, prisma, redisClient } = makeService();
            prisma.user.findUnique.mockResolvedValue({ id: 'u1' });
            redisClient.set = jest.fn();

            await expect(service.requestPasswordReset('e')).resolves.toBe(true);
            expect(redisClient.set).toHaveBeenCalled();
            expect((service as any).mailService.sendResetPasswordToken).toHaveBeenCalled();
        });

        it('requestPasswordReset returns false on error', async () => {
            const { service, prisma } = makeService();
            prisma.user.findUnique.mockRejectedValue(new Error('db'));
            await expect(service.requestPasswordReset('e')).resolves.toBe(false);
        });

        it('validateResetToken returns boolean', async () => {
            const { service, redisClient } = makeService();
            redisClient.get.mockResolvedValue('u1');
            await expect(service.validateResetToken('t')).resolves.toBe(true);
            redisClient.get.mockRejectedValue(new Error('redis'));
            await expect(service.validateResetToken('t')).resolves.toBe(false);
        });

        it('resetPassword returns false when token missing, true when successful', async () => {
            const { service, redisClient, prisma } = makeService();

            redisClient.get.mockResolvedValueOnce(null);
            await expect(service.resetPassword({ token: 't', password: 'p' } as any)).resolves.toBe(false);

            redisClient.get.mockResolvedValueOnce('u1');
            (argon2.hash as any).mockResolvedValue('h');
            prisma.user.update.mockResolvedValue({});
            await expect(service.resetPassword({ token: 't', password: 'p' } as any)).resolves.toBe(true);
            expect(redisClient.del).toHaveBeenCalledWith('password_reset:t');
        });
    });

    describe('generateAccessToken/generateRefreshToken', () => {
        it('throws when expiration env vars are missing', async () => {
            const { service } = makeService({
                config: { get: jest.fn(() => undefined) },
            });
            await expect(service.generateAccessToken({ sub: 'u1' })).rejects.toThrow(
                'JWT_ACCESS_EXPIRATION environment variable is not defined',
            );
            await expect(service.generateRefreshToken('u1')).rejects.toThrow(
                'JWT_REFRESH_EXPIRATION environment variable is not defined',
            );
        });

        it('stores access token jti in redis (swallows redis errors)', async () => {
            const { service, redisClient } = makeService({
                redisClient: {
                    ...makeService().redisClient,
                    set: jest.fn().mockRejectedValue(new Error('redis')),
                    get: jest.fn(),
                    del: jest.fn(),
                    keys: jest.fn(),
                },
            });
            await expect(service.generateAccessToken({ sub: 'u1' })).resolves.toBe('signed');
            expect(redisClient.set).toHaveBeenCalled();
        });

        it('stores refresh token jti in redis and returns signed token', async () => {
            const { service, redisClient } = makeService({
                redisClient: {
                    ...makeService().redisClient,
                    set: jest.fn().mockResolvedValue('OK'),
                },
            });
            await expect(service.generateRefreshToken('u1')).resolves.toBe('signed');
            expect(redisClient.set).toHaveBeenCalled();
        });
    });
});
