import { Global, Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transport: {
          service: 'gmail',
          auth: {
            user: configService.get('EMAIL'),
            pass: configService.get('EMAIL_PASSWORD'),
          },
        },
        defaults: {
          from: configService.get(
            'EMAIL_FROM',
            '"Expense Tracker" <noreply@expensetracker.com>',
          ),
        },
      }),
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
