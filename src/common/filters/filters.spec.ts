import {
    BadRequestException,
    ForbiddenException,
    HttpException,
    HttpStatus,
    Logger,
    UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { AllExceptionsFilter } from './all-exceptions.filter';
import { HttpExceptionFilter } from './http-exception.filter';
import { PrismaExceptionFilter } from './prisma-exception.filter';
import { PrismaUnknownExceptionFilter } from './prisma-unknown-exception.filter';

describe('Exception filters', () => {
    const makeHost = (reqOverrides?: any) => {
        const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn().mockReturnThis(),
        };
        const req: any = { method: 'GET', url: '/x', ...reqOverrides };

        const host: any = {
            switchToHttp: () => ({
                getResponse: () => res,
                getRequest: () => req,
            }),
        };

        return { host, req, res };
    };

    beforeEach(() => {
        jest.restoreAllMocks();
        jest.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    });

    describe('AllExceptionsFilter', () => {
        it('formats HttpException with object response and details', () => {
            const { host, res } = makeHost();
            const filter = new AllExceptionsFilter();

            const ex = new BadRequestException({
                message: 'bad',
                error: 'Bad Request',
                foo: 'bar',
            });

            filter.catch(ex, host);

            expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.BAD_REQUEST,
                    message: 'bad',
                    error: 'Bad Request',
                    details: { foo: 'bar' },
                    path: '/x',
                }),
            );
        });

        it('formats HttpException with string response', () => {
            const { host, res } = makeHost();
            const filter = new AllExceptionsFilter();
            const ex = new HttpException('nope', HttpStatus.CONFLICT);

            filter.catch(ex, host);

            expect(res.status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    statusCode: HttpStatus.CONFLICT,
                    message: 'nope',
                    error: 'Conflict',
                }),
            );
        });

        it('formats Error differently in production vs non-production and logs non-401/403', () => {
            const { host, res } = makeHost();
            const filter = new AllExceptionsFilter();

            const oldEnv = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';
            filter.catch(new Error('secret'), host);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'Internal server error', details: null }),
            );

            process.env.NODE_ENV = 'test';
            filter.catch(new Error('dev-msg'), host);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'dev-msg', details: expect.any(Object) }),
            );

            process.env.NODE_ENV = oldEnv;
        });

        it('handles unknown exception types', () => {
            const { host, res } = makeHost();
            const filter = new AllExceptionsFilter();
            filter.catch(123 as any, host);
            expect(res.status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'An unexpected error occurred' }),
            );
        });

        it('does not log 401/403', () => {
            const { host } = makeHost();
            const filter = new AllExceptionsFilter();

            const loggerSpy = jest.spyOn(Logger.prototype, 'error');

            filter.catch(new UnauthorizedException('u'), host);
            filter.catch(new ForbiddenException('f'), host);

            expect(loggerSpy).not.toHaveBeenCalled();
        });
    });

    describe('HttpExceptionFilter', () => {
        it('uses first validation message and includes details', () => {
            const { host, res } = makeHost();
            const filter = new HttpExceptionFilter();

            const ex = new BadRequestException({
                message: ['m1', 'm2'],
                error: 'Bad Request',
            });

            filter.catch(ex, host);

            expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'm1',
                    details: { validation: ['m1', 'm2'] },
                }),
            );
        });

        it('does not log for 401/403', () => {
            const { host } = makeHost();
            const filter = new HttpExceptionFilter();

            const loggerSpy = jest.spyOn(Logger.prototype, 'error');
            filter.catch(new UnauthorizedException('u'), host);
            filter.catch(new ForbiddenException('f'), host);
            expect(loggerSpy).not.toHaveBeenCalled();
        });

        it('logs for other statuses and handles string response', () => {
            const { host, res } = makeHost({ method: 'POST' });
            const filter = new HttpExceptionFilter();
            const loggerSpy = jest.spyOn(Logger.prototype, 'error');

            filter.catch(new HttpException('oops', HttpStatus.CONFLICT), host);
            expect(loggerSpy).toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ message: 'oops', error: 'Conflict' }),
            );
        });
    });

    describe('PrismaExceptionFilter', () => {
        const run = (code: string, meta?: any, env?: string) => {
            const old = process.env.NODE_ENV;
            process.env.NODE_ENV = env ?? 'test';

            const { host, res } = makeHost();
            const filter = new PrismaExceptionFilter();

            filter.catch(
                {
                    code,
                    meta,
                    clientVersion: '1',
                    stack: 's',
                } as any,
                host,
            );

            process.env.NODE_ENV = old;
            return { res };
        };

        it('maps all prisma known error codes and default branch', () => {
            const cases: Array<{ code: string; expectedStatus: number }> = [
                { code: 'P2002', expectedStatus: HttpStatus.CONFLICT },
                { code: 'P2003', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2001', expectedStatus: HttpStatus.NOT_FOUND },
                { code: 'P2018', expectedStatus: HttpStatus.NOT_FOUND },
                { code: 'P2025', expectedStatus: HttpStatus.NOT_FOUND },
                { code: 'P2004', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2011', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2012', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2005', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2006', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2007', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2019', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P2020', expectedStatus: HttpStatus.BAD_REQUEST },
                { code: 'P1000', expectedStatus: HttpStatus.SERVICE_UNAVAILABLE },
                { code: 'P1001', expectedStatus: HttpStatus.SERVICE_UNAVAILABLE },
                { code: 'P1002', expectedStatus: HttpStatus.SERVICE_UNAVAILABLE },
                { code: 'P2009', expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR },
                { code: 'P2010', expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR },
                { code: 'P2015', expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR },
                { code: 'P9999', expectedStatus: HttpStatus.INTERNAL_SERVER_ERROR },
            ];

            for (const c of cases) {
                const { res } = run(c.code, { target: ['email'] });
                expect(res.status).toHaveBeenCalledWith(c.expectedStatus);
            }
        });

        it('hides details in production for unknown codes but not for known ones', () => {
            const prodUnknown = run('P9999', { target: ['x'] }, 'production');
            const unknownCalls = (prodUnknown.res.json as jest.Mock).mock.calls;
            const lastUnknown = unknownCalls[unknownCalls.length - 1]?.[0];
            expect(lastUnknown.details).toBeNull();

            const prodKnown = run('P2002', { target: ['email'] }, 'production');
            const knownCalls = (prodKnown.res.json as jest.Mock).mock.calls;
            const lastKnown = knownCalls[knownCalls.length - 1]?.[0];
            expect(lastKnown.details).not.toBeNull();
        });

        it('adds extra dev details when not production', () => {
            const { res } = run('P2002', { target: ['email'] }, 'test');
            const calls = (res.json as jest.Mock).mock.calls;
            const payload = calls[calls.length - 1]?.[0];
            expect(payload.details).toEqual(expect.objectContaining({ prismaCode: 'P2002' }));
        });
    });

    describe('PrismaUnknownExceptionFilter', () => {
        const makePrismaError = <T extends Error>(proto: any, props: any = {}): T => {
            const err = Object.create(proto);
            Object.assign(err, props);
            return err;
        };

        it('returns 400 for validation errors, includes details in non-production', () => {
            const { host, res } = makeHost();
            const filter = new PrismaUnknownExceptionFilter();

            const old = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';

            const ex = makePrismaError<Prisma.PrismaClientValidationError>(
                Prisma.PrismaClientValidationError.prototype,
                { name: 'PrismaClientValidationError', message: 'm', stack: 's' },
            );

            filter.catch(ex, host);
            expect(res.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ details: expect.objectContaining({ errorName: ex.name }) }),
            );

            process.env.NODE_ENV = old;
        });

        it('returns 503 for initialization errors and hides details in production', () => {
            const { host, res } = makeHost();
            const filter = new PrismaUnknownExceptionFilter();

            const old = process.env.NODE_ENV;
            process.env.NODE_ENV = 'production';

            const ex = makePrismaError<Prisma.PrismaClientInitializationError>(
                Prisma.PrismaClientInitializationError.prototype,
                { name: 'PrismaClientInitializationError', message: 'm', stack: 's', clientVersion: '1' },
            );

            filter.catch(ex, host);
            expect(res.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ details: null }),
            );

            process.env.NODE_ENV = old;
        });

        it('adds clientVersion for unknown/rustpanic/init errors in non-production', () => {
            const { host, res } = makeHost();
            const filter = new PrismaUnknownExceptionFilter();

            const old = process.env.NODE_ENV;
            process.env.NODE_ENV = 'test';

            const ex = makePrismaError<Prisma.PrismaClientUnknownRequestError>(
                Prisma.PrismaClientUnknownRequestError.prototype,
                { name: 'PrismaClientUnknownRequestError', message: 'm', stack: 's', clientVersion: '1' },
            );

            filter.catch(ex, host);
            const calls = (res.json as jest.Mock).mock.calls;
            const payload = calls[calls.length - 1]?.[0];
            expect(payload.details).toEqual(
                expect.objectContaining({ clientVersion: '1' }),
            );

            process.env.NODE_ENV = old;
        });
    });
});
