import { Test } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';

describe('AppController', () => {
    let appController: AppController;
    let appService: AppService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        appController = moduleRef.get(AppController);
        appService = moduleRef.get(AppService);
    });

    describe('getHello', () => {
        it('should return API metadata object', () => {
            const result = appController.getHello();

            expect(result).toEqual(
                expect.objectContaining({
                    name: 'Expense Tracker API',
                    status: 'online',
                    version: expect.any(String),
                }),
            );

            expect((result as any).documentation).toEqual(
                expect.objectContaining({ swagger: '/api/docs' }),
            );
        });

        it('should delegate to AppService.getHello()', () => {
            const spy = jest.spyOn(appService, 'getHello');

            appController.getHello();

            expect(spy).toHaveBeenCalledTimes(1);
        });
    });
});
