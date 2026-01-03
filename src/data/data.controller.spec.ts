import { DataController } from './data.controller';

describe('DataController', () => {
    it('exportData delegates to service', async () => {
        const dataService: any = { exportData: jest.fn().mockResolvedValue({ ok: true }) };
        const controller = new DataController(dataService);

        await expect(controller.exportData({ user: { id: 'u1' } } as any)).resolves.toEqual({
            ok: true,
        });
        expect(dataService.exportData).toHaveBeenCalledWith('u1');
    });

    it('importData delegates to service and returns message', async () => {
        const dataService: any = { importData: jest.fn().mockResolvedValue(undefined) };
        const controller = new DataController(dataService);

        await expect(
            controller.importData({ user: { id: 'u1' } } as any, { some: 'payload' } as any),
        ).resolves.toEqual({ message: 'Data imported successfully' });
        expect(dataService.importData).toHaveBeenCalledWith('u1', { some: 'payload' });
    });
});
