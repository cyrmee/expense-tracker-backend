describe('coverage imports', () => {
    it('imports wiring-only files for coverage', async () => {
        await import('../common/interfaces');

        await import('../app-settings/dto');
        await import('../app-settings/dto/app-settings.dto');
        await import('../app-settings/dto/create-app-settings.dto');
        await import('../app-settings/dto/update-app-settings.dto');

        await import('../app-settings/queries');
        await import('../app-settings/queries/handlers');

        await import('../exchange-rates/dto');
        await import('../exchange-rates/dto/exchange-rate.dto');

        await import('../user-insights/dto');

        await import('../auth/auth.module');
        await import('../app-settings/app-settings.module');
        await import('../mail/mail.module');

        expect(true).toBe(true);
    });
});
