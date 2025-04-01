import { MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly mailerService: MailerService,
    private readonly config: ConfigService,
  ) {}

  async sendResetPasswordToken(
    email: string,
    resetPasswordToken: string,
  ): Promise<void> {
    try {
      const url = `${this.config.get('FRONTEND_URL')}/auth/reset-password/${resetPasswordToken}`;

      const emailBody = `You have requested a password reset for your account.\nPlease click on the following link to reset your password:\n\n${url}\n\nThis link will expire in 10 minutes.`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Password Reset Request',
        text: emailBody,
      });

      this.logger.log(`Reset password email sent to ${email}`);
    } catch (error) {
      this.logger.error(
        `Failed to send reset password email to ${email}`,
        error.stack,
      );
      throw error;
    }
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    try {
      const emailBody = `You have requested an OTP for your account.\n\nOTP: ${otp}\n\nThis code will expire in 10 minutes.`;

      await this.mailerService.sendMail({
        to: email,
        subject: 'Expense Tracker OTP',
        text: emailBody,
      });

      this.logger.log(`OTP email sent to ${email}`);
    } catch (error) {
      this.logger.error(`Failed to send OTP email to ${email}`, error.stack);
      throw error;
    }
  }
}
