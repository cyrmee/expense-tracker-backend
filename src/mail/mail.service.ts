import { MailerService } from '@nestjs-modules/mailer';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailService {
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
    } catch (error) {
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
    } catch (error) {
      throw error;
    }
  }
}
