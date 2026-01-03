import {
    BadRequestException,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
    const makeController = (overrides?: Partial<AuthService>) => {
        const authService: any = {
            register: jest.fn(),
            login: jest.fn(),
            logout: jest.fn(),
            refreshAccessToken: jest.fn(),
            changePassword: jest.fn(),
            requestPasswordReset: jest.fn(),
            validateResetToken: jest.fn(),
            resetPassword: jest.fn(),
            requestEmailVerification: jest.fn(),
            verifyEmailOtp: jest.fn(),
            ...overrides,
        };

        const controller = new AuthController(authService as AuthService);
        return { controller, authService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('register delegates to AuthService.register', async () => {
        const { controller, authService } = makeController();
        authService.register.mockResolvedValue({ id: 'u1' });

        const res = await controller.register({ email: 'a@b.com' } as any);

        expect(authService.register).toHaveBeenCalledWith({ email: 'a@b.com' });
        expect(res).toEqual({ id: 'u1' });
    });

    it('changePassword delegates user.id and dto', async () => {
        const { controller, authService } = makeController();

        await expect(
            controller.changePassword(
                { user: { id: 'u1' } } as any,
                { currentPassword: 'a', newPassword: 'b' } as any,
            ),
        ).resolves.toBeUndefined();

        expect(authService.changePassword).toHaveBeenCalledWith('u1', {
            currentPassword: 'a',
            newPassword: 'b',
        });
    });

    it('getCurrentUser returns req.user', async () => {
        const { controller } = makeController();
        await expect(controller.getCurrentUser({ user: { id: 'u1' } } as any)).resolves.toEqual({
            id: 'u1',
        });
    });

    it('resetPassword returns message when service returns true', async () => {
        const { controller, authService } = makeController();
        authService.resetPassword.mockResolvedValue(true);

        await expect(controller.resetPassword({ token: 't' } as any)).resolves.toEqual({
            message: 'Password has been reset successfully',
        });
    });

    it('login throws UnauthorizedException when req.user missing', async () => {
        const { controller } = makeController();

        await expect(controller.login({} as any)).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('logout passes refreshToken + userId', async () => {
        const { controller, authService } = makeController();
        authService.logout.mockResolvedValue({ message: 'ok' });

        const res = await controller.logout(
            { user: { id: 'u1' } } as any,
            'Bearer token',
            { refreshToken: 'rt' },
        );

        expect(authService.logout).toHaveBeenCalledWith('rt', 'u1');
        expect(res).toEqual({ message: 'ok' });
    });

    it('refreshAccessToken delegates to service', async () => {
        const { controller, authService } = makeController();
        authService.refreshAccessToken.mockResolvedValue({ accessToken: 'at' });

        const res = await controller.refreshAccessToken({ refreshToken: 'rt' });

        expect(authService.refreshAccessToken).toHaveBeenCalledWith('rt');
        expect(res).toEqual({ accessToken: 'at' });
    });

    it('requestPasswordReset returns fixed message', async () => {
        const { controller, authService } = makeController();

        const res = await controller.requestPasswordReset({ email: 'a@b.com' } as any);

        expect(authService.requestPasswordReset).toHaveBeenCalledWith('a@b.com');
        expect(res.message).toContain('If your email exists');
    });

    it('validateResetToken returns { valid }', async () => {
        const { controller, authService } = makeController();
        authService.validateResetToken.mockResolvedValue(true);

        await expect(controller.validateResetToken({ token: 't' } as any)).resolves.toEqual({ valid: true });
    });

    it('resetPassword throws BadRequestException when service returns false', async () => {
        const { controller, authService } = makeController();
        authService.resetPassword.mockResolvedValue(false);

        await expect(controller.resetPassword({ token: 't' } as any)).rejects.toBeInstanceOf(
            BadRequestException,
        );
    });

    it('requestEmailVerification returns message', async () => {
        const { controller, authService } = makeController();

        const res = await controller.requestEmailVerification({ email: 'a@b.com' });

        expect(authService.requestEmailVerification).toHaveBeenCalledWith('a@b.com');
        expect(res).toEqual({ message: 'Verification email has been sent' });
    });

    it('verifyEmail returns verified response with message', async () => {
        const { controller, authService } = makeController();
        authService.verifyEmailOtp.mockResolvedValue({ user: { id: 'u1' } });

        const res = await controller.verifyEmail({ otp: '123' });

        expect(authService.verifyEmailOtp).toHaveBeenCalledWith('123');
        expect(res).toEqual(
            expect.objectContaining({
                user: { id: 'u1' },
                verified: true,
                message: 'Email verified and logged in successfully',
            }),
        );
    });

    it('verifyEmail rethrows UnauthorizedException', async () => {
        const { controller, authService } = makeController();
        authService.verifyEmailOtp.mockRejectedValue(new UnauthorizedException('x'));

        await expect(controller.verifyEmail({ otp: '123' })).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('verifyEmail wraps unknown errors as InternalServerErrorException', async () => {
        const { controller, authService } = makeController();
        authService.verifyEmailOtp.mockRejectedValue(new Error('boom'));

        await expect(controller.verifyEmail({ otp: '123' })).rejects.toBeInstanceOf(
            InternalServerErrorException,
        );
    });
});
