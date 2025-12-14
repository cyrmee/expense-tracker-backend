import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Resend } from 'resend';

@Injectable()
export class MailService {
  constructor(
    @Inject('RESEND') private readonly resendApiKey: string,
    private readonly config: ConfigService,
  ) {}

  async sendResetPasswordToken(
    email: string,
    resetPasswordToken: string,
  ): Promise<void> {
    const resend = new Resend(this.resendApiKey);

    const url = `${this.config.get('FRONTEND_URL')}/auth/reset-password/${resetPasswordToken}`;

    const emailBody = `You have requested a password reset for your account.\nPlease click on the following link to reset your password:\n\n${url}\n\nThis link will expire in 10 minutes.`;

    const fromEmail = this.config.get('FROM_EMAIL') || 'noreply@mehretab.com'; // Replace with your verified domain

    const { error } = await resend.emails.send({
      from: `Expense Tracker <${fromEmail}>`,
      to: [email],
      subject: 'Password Reset Request',
      text: emailBody,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  async sendOTP(email: string, otp: string): Promise<void> {
    const { Resend } = await import('resend');
    const resend = new Resend(this.resendApiKey);

    const emailBody = `You have requested an OTP for your account.\n\nOTP: ${otp}\n\nThis code will expire in 10 minutes.`;

    const fromEmail = this.config.get('FROM_EMAIL') || 'noreply@mehretab.com'; // Replace with your verified domain

    const { error } = await resend.emails.send({
      from: `Expense Tracker <${fromEmail}>`,
      to: [email],
      subject: 'Expense Tracker OTP',
      text: emailBody,
    });

    if (error) {
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }
}
