import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import * as request from 'supertest';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';

describe('App (e2e)', () => {
    let app: INestApplication;

    beforeAll(async () => {
        const moduleRef = await Test.createTestingModule({
            controllers: [AppController],
            providers: [AppService],
        }).compile();

        app = moduleRef.createNestApplication();
        await app.init();
    });

    afterAll(async () => {
        await app.close();
    });

    it('GET / returns API metadata', async () => {
        await request(app.getHttpServer())
            .get('/')
            .expect(200)
            .expect((res) => {
                expect(res.body).toEqual(
                    expect.objectContaining({
                        name: 'Expense Tracker API',
                        status: 'online',
                    }),
                );
            });
    });
});
