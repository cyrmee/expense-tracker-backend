import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserService } from './user.service';

describe('UserService', () => {
    const makeService = (overrides?: Partial<PrismaService>) => {
        const prisma: any = {
            user: {
                findMany: jest.fn(),
                findUnique: jest.fn(),
                update: jest.fn(),
                delete: jest.fn(),
            },
            ...overrides,
        };

        const service = new UserService(prisma as PrismaService);
        return { service, prisma };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('getUsers fills empty profilePicture', async () => {
        const { service, prisma } = makeService();
        prisma.user.findMany.mockResolvedValue([
            { id: 'u1', profilePicture: null },
            { id: 'u2', profilePicture: 'pic' },
        ]);

        const users = await service.getUsers();

        expect(users).toEqual([
            { id: 'u1', profilePicture: '' },
            { id: 'u2', profilePicture: 'pic' },
        ]);
    });

    it('getUserById throws when missing', async () => {
        const { service, prisma } = makeService();
        prisma.user.findUnique.mockResolvedValue(null);

        await expect(service.getUserById('u1')).rejects.toBeInstanceOf(
            NotFoundException,
        );
    });

    it('getUserById fills empty profilePicture', async () => {
        const { service, prisma } = makeService();
        prisma.user.findUnique.mockResolvedValue({
            id: 'u1',
            email: 'a@b.com',
            name: 'A',
            profilePicture: null,
            isVerified: true,
            lastLoginAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        });

        const user = await service.getUserById('u1');
        expect(user?.profilePicture).toBe('');
    });

    it('updateProfile resets isVerified when email changes', async () => {
        const { service, prisma } = makeService();

        prisma.user.findUnique.mockResolvedValue({ id: 'u1', email: 'old@a.com' });
        prisma.user.update
            .mockResolvedValueOnce({ id: 'u1', email: 'new@a.com' }) // updateProfile call
            .mockResolvedValueOnce({}); // second update to set isVerified false

        await service.updateProfile('u1', { email: 'new@a.com' } as any);

        expect(prisma.user.update).toHaveBeenCalledWith(
            expect.objectContaining({
                where: { id: 'u1' },
                data: expect.objectContaining({ isVerified: false }),
            }),
        );
    });

    it('deleteUser throws when userId missing', async () => {
        const { service } = makeService();
        await expect(service.deleteUser('')).rejects.toBeInstanceOf(Error);
    });
});
