import { NotFoundException } from '@nestjs/common';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';

describe('CategoriesController', () => {
    const makeController = (overrides?: Partial<CategoriesService>) => {
        const categoriesService: any = {
            getCategories: jest.fn(),
            getCategory: jest.fn(),
            create: jest.fn(),
            update: jest.fn(),
            remove: jest.fn(),
            ...overrides,
        };

        const controller = new CategoriesController(
            categoriesService as CategoriesService,
        );

        return { controller, categoriesService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('findAll delegates to service with req.user.id', async () => {
        const { controller, categoriesService } = makeController();
        categoriesService.getCategories.mockResolvedValue([{ id: 'c1' }]);

        const res = await controller.findAll({ user: { id: 'u1' } } as any);

        expect(categoriesService.getCategories).toHaveBeenCalledWith('u1');
        expect(res).toEqual([{ id: 'c1' }]);
    });

    it('findOne throws NotFoundException when category missing', async () => {
        const { controller, categoriesService } = makeController();
        categoriesService.getCategory.mockResolvedValue(null);

        await expect(
            controller.findOne('c1', { user: { id: 'u1' } } as any),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('findOne returns category when found', async () => {
        const { controller, categoriesService } = makeController();
        categoriesService.getCategory.mockResolvedValue({ id: 'c1' });

        await expect(
            controller.findOne('c1', { user: { id: 'u1' } } as any),
        ).resolves.toEqual({ id: 'c1' });
    });

    it('create returns success message', async () => {
        const { controller, categoriesService } = makeController();

        const res = await controller.create(
            { name: 'Food' } as any,
            { user: { id: 'u1' } } as any,
        );

        expect(categoriesService.create).toHaveBeenCalledWith({ name: 'Food' }, 'u1');
        expect(res).toEqual({ message: 'Category created successfully' });
    });

    it('update delegates and returns void', async () => {
        const { controller, categoriesService } = makeController();

        const res = await controller.update(
            'c1',
            { name: 'New' } as any,
            { user: { id: 'u1' } } as any,
        );

        expect(categoriesService.update).toHaveBeenCalledWith('c1', { name: 'New' }, 'u1');
        expect(res).toBeUndefined();
    });

    it('remove throws when service returns falsy', async () => {
        const { controller, categoriesService } = makeController();
        categoriesService.remove.mockResolvedValue(null);

        await expect(
            controller.remove('c1', { user: { id: 'u1' } } as any),
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('remove returns void when deleted', async () => {
        const { controller, categoriesService } = makeController();
        categoriesService.remove.mockResolvedValue(true);

        await expect(
            controller.remove('c1', { user: { id: 'u1' } } as any),
        ).resolves.toBeUndefined();
    });
});
