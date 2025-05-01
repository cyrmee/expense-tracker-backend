import { MailerModule } from '@nestjs-modules/mailer';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const email = configService.get('EMAIL');
        if (!email) {
          throw new Error('EMAIL environment variable is not defined');
        }

        const emailPassword = configService.get('EMAIL_PASSWORD');
        if (!emailPassword) {
          throw new Error('EMAIL_PASSWORD environment variable is not defined');
        }

        const emailFrom = configService.get('EMAIL_FROM');
        if (!emailFrom) {
          throw new Error('EMAIL_FROM environment variable is not defined');
        }

        return {
          transport: {
            service: 'gmail',
            auth: {
              user: email,
              pass: emailPassword,
            },
          },
          defaults: {
            from: emailFrom,
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
