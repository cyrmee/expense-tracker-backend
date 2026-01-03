import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtStrategy } from './jwt.strategy';
import { LocalStrategy } from './local.strategy';

describe('Auth strategies', () => {
    describe('JwtStrategy', () => {
        const makeConfig = (jwtSecret?: string) =>
            ({
                get: jest.fn((key: string) => (key === 'JWT_SECRET' ? jwtSecret : undefined)),
            }) as unknown as ConfigService;

        it('throws when JWT_SECRET missing', () => {
            expect(() => new JwtStrategy(makeConfig(), { get: jest.fn() })).toThrow(
                'JWT secret is not defined in the environment variables',
            );
        });

        it('throws when token type is not access', async () => {
            const strat = new JwtStrategy(makeConfig('s'), { get: jest.fn() });
            await expect(strat.validate({ type: 'refresh' })).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('throws when token jti missing in redis', async () => {
            const strat = new JwtStrategy(makeConfig('s'), { get: jest.fn().mockResolvedValue(null) });
            await expect(
                strat.validate({ sub: 'u1', type: 'access', jti: 'j', isActive: true, isVerified: true }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('throws when user inactive or not verified', async () => {
            const strat = new JwtStrategy(makeConfig('s'), { get: jest.fn().mockResolvedValue('{}') });

            await expect(
                strat.validate({ sub: 'u1', type: 'access', jti: 'j', isActive: false, isVerified: true }),
            ).rejects.toBeInstanceOf(UnauthorizedException);

            await expect(
                strat.validate({ sub: 'u1', type: 'access', jti: 'j', isActive: true, isVerified: false }),
            ).rejects.toBeInstanceOf(UnauthorizedException);
        });

        it('returns mapped user when valid', async () => {
            const strat = new JwtStrategy(makeConfig('s'), { get: jest.fn().mockResolvedValue('{}') });
            await expect(
                strat.validate({
                    sub: 'u1',
                    type: 'access',
                    jti: 'j',
                    email: 'e',
                    name: 'n',
                    isActive: true,
                    isVerified: true,
                }),
            ).resolves.toEqual({
                id: 'u1',
                email: 'e',
                name: 'n',
                isActive: true,
                isVerified: true,
            });
        });
    });

    describe('LocalStrategy', () => {
        it('throws on invalid credentials', async () => {
            const authService: any = { validateUser: jest.fn().mockResolvedValue(null) };
            const strat = new LocalStrategy(authService);
            await expect(strat.validate('e', 'p')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('throws on deactivated user', async () => {
            const authService: any = {
                validateUser: jest.fn().mockResolvedValue({ isActive: false, isVerified: true }),
            };
            const strat = new LocalStrategy(authService);
            await expect(strat.validate('e', 'p')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('throws on unverified user', async () => {
            const authService: any = {
                validateUser: jest.fn().mockResolvedValue({ isActive: true, isVerified: false }),
            };
            const strat = new LocalStrategy(authService);
            await expect(strat.validate('e', 'p')).rejects.toBeInstanceOf(
                UnauthorizedException,
            );
        });

        it('returns user when valid', async () => {
            const authService: any = {
                validateUser: jest.fn().mockResolvedValue({ id: 'u1', isActive: true, isVerified: true }),
            };
            const strat = new LocalStrategy(authService);
            await expect(strat.validate('e', 'p')).resolves.toEqual(
                expect.objectContaining({ id: 'u1' }),
            );
        });
    });
});
