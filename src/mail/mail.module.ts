import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [
    {
      provide: 'RESEND',
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get('RESEND_API_KEY');
        if (!apiKey) {
          throw new Error('RESEND_API_KEY environment variable is not defined');
        }
        // We'll import Resend in the service
        return apiKey;
      },
      inject: [ConfigService],
    },
    MailService,
  ],
  exports: [MailService],
})
export class MailModule {}
