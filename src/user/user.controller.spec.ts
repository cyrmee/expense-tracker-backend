import { UserController } from './user.controller';
import { UserService } from './user.service';

describe('UserController', () => {
    const makeController = (overrides?: Partial<UserService>) => {
        const userService: any = {
            getProfile: jest.fn(),
            updateProfile: jest.fn(),
            deleteUser: jest.fn(),
            ...overrides,
        };

        const controller = new UserController(userService as UserService);
        return { controller, userService };
    };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('getProfile delegates to service', async () => {
        const { controller, userService } = makeController();
        userService.getProfile.mockResolvedValue({ id: 'u1' });

        const res = await controller.getProfile({ user: { id: 'u1' } } as any);

        expect(userService.getProfile).toHaveBeenCalledWith('u1');
        expect(res).toEqual({ id: 'u1' });
    });

    it('updateProfile returns message', async () => {
        const { controller, userService } = makeController();

        const res = await controller.updateProfile(
            { user: { id: 'u1' } } as any,
            { name: 'N' } as any,
        );

        expect(userService.updateProfile).toHaveBeenCalledWith('u1', { name: 'N' });
        expect(res).toEqual({ message: 'Profile updated successfully' });
    });

    it('deleteProfile returns message', async () => {
        const { controller, userService } = makeController();

        const res = await controller.deleteProfile({ user: { id: 'u1' } } as any);

        expect(userService.deleteUser).toHaveBeenCalledWith('u1');
        expect(res).toEqual({ message: 'User profile deleted successfully' });
    });
});
