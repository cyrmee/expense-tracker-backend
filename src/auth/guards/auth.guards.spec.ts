import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

jest.mock('@nestjs/passport', () => {
    return {
        AuthGuard: () => {
            return class {
                async canActivate() {
                    return true;
                }
            };
        },
    };
});

import { JwtAuthGuard } from './jwt-auth.guard';
import { LocalAuthGuard } from './local-auth.guard';
import { LogoutGuard } from './logout.guard';

describe('Auth guards', () => {
    const makeContext = (user: any): ExecutionContext =>
        ({
            switchToHttp: () => ({
                getRequest: () => ({ user }),
            }),
        }) as any;

    it('JwtAuthGuard throws when user inactive', async () => {
        const guard = new JwtAuthGuard({} as any);
        await expect(guard.canActivate(makeContext({ isActive: false }))).rejects.toBeInstanceOf(
            UnauthorizedException,
        );
    });

    it('JwtAuthGuard returns true when active', async () => {
        const guard = new JwtAuthGuard({} as any);
        await expect(guard.canActivate(makeContext({ isActive: true }))).resolves.toBe(true);
    });

    it('LocalAuthGuard delegates to passport', async () => {
        const guard = new LocalAuthGuard();
        await expect(guard.canActivate(makeContext({}))).resolves.toBe(true);
    });

    it('LogoutGuard always allows', () => {
        const guard = new LogoutGuard();
        expect(guard.canActivate({} as any)).toBe(true);
    });
});
