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
        const smtpHost = configService.get('SMTP_HOST');
        if (!smtpHost) {
          throw new Error('SMTP_HOST environment variable is not defined');
        }

        const smtpPort = configService.get('SMTP_PORT');
        if (!smtpPort) {
          throw new Error('SMTP_PORT environment variable is not defined');
        }

        const smtpSecure = configService.get('SMTP_SECURE') === 'true';
        const smtpUser = configService.get('SMTP_USER');
        if (!smtpUser) {
          throw new Error('SMTP_USER environment variable is not defined');
        }

        const smtpPass = configService.get('SMTP_PASS');
        if (!smtpPass) {
          throw new Error('SMTP_PASS environment variable is not defined');
        }

        return {
          transport: {
            host: smtpHost,
            port: Number.parseInt(smtpPort, 10),
            secure: smtpSecure,  // true for 465, false for 587
            auth: {
              user: smtpUser,
              pass: smtpPass,
            },
          },
          defaults: {
            from: `"Expense Tracker" <${smtpUser}>`,
          },
        };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
