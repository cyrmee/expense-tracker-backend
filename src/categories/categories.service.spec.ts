import {
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';

describe('CategoriesService', () => {
  const makeService = (overrides?: Partial<PrismaService>) => {
    const prisma: any = {
      category: {
        findMany: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      expense: {
        findFirst: jest.fn(),
      },
      ...overrides,
    };

    const service = new CategoriesService(prisma as PrismaService);
    return { service, prisma };
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('throws when category name already exists (case-insensitive)', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({ id: 'c1' });

      await expect(
        service.create({ name: 'Food', icon: '🍔', color: '#fff' } as any, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.category.create).not.toHaveBeenCalled();
    });

    it('creates a non-default category', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(null);

      await service.create(
        { name: 'Food', icon: '🍔', color: '#fff' } as any,
        'u1',
      );

      expect(prisma.category.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'Food',
            isDefault: false,
            user: { connect: { id: 'u1' } },
          }),
        }),
      );
    });
  });

  describe('update', () => {
    it('throws when id is missing', async () => {
      const { service } = makeService();
      await expect(service.update('', {} as any, 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws when category not found', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'X' } as any, 'u1'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws when attempting to update a default category', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({
        id: 'c1',
        name: 'Default',
        isDefault: true,
      });

      await expect(
        service.update('c1', { name: 'New' } as any, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('throws when new name duplicates another category (case-insensitive)', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst
        .mockResolvedValueOnce({ id: 'c1', name: 'Old', isDefault: false })
        .mockResolvedValueOnce({ id: 'c2', name: 'Food', isDefault: false });

      await expect(
        service.update('c1', { name: 'Food' } as any, 'u1'),
      ).rejects.toBeInstanceOf(BadRequestException);

      expect(prisma.category.update).not.toHaveBeenCalled();
    });

    it('updates when valid', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst
        .mockResolvedValueOnce({ id: 'c1', name: 'Old', isDefault: false })
        .mockResolvedValueOnce(null);

      await service.update('c1', { name: 'New' } as any, 'u1');

      expect(prisma.category.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'c1' },
          data: expect.objectContaining({
            name: 'New',
            updatedAt: expect.any(Date),
          }),
        }),
      );
    });
  });

  describe('remove', () => {
    it('throws when category not found', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue(null);

      await expect(service.remove('c1', 'u1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws when deleting default category', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({ id: 'c1', isDefault: true });

      await expect(service.remove('c1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });

    it('throws when category is used by any expense', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({ id: 'c1', isDefault: false });
      prisma.expense.findFirst.mockResolvedValue({ id: 'e1' });

      await expect(service.remove('c1', 'u1')).rejects.toBeInstanceOf(
        BadRequestException,
      );

      expect(prisma.category.delete).not.toHaveBeenCalled();
    });

    it('deletes category when unused', async () => {
      const { service, prisma } = makeService();
      prisma.category.findFirst.mockResolvedValue({ id: 'c1', isDefault: false });
      prisma.expense.findFirst.mockResolvedValue(null);
      prisma.category.delete.mockResolvedValue({ id: 'c1' });

      await expect(service.remove('c1', 'u1')).resolves.toEqual({ id: 'c1' });
      expect(prisma.category.delete).toHaveBeenCalledWith({ where: { id: 'c1' } });
    });
  });
});
