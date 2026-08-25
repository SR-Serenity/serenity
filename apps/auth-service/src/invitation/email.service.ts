/* eslint-disable max-len */
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(private readonly configService: ConfigService) {}

  async sendInvitationEmail(
    email: string,
    inviterName: string,
    orgName: string,
    inviteUrl: string
  ) {
    const apiKey = this.configService.get<string>('RESEND_API_KEY');
    if (!apiKey) {
      this.logger.warn(
        `Email not sent (RESEND_API_KEY not set) — to: ${email}, org: ${orgName}`
      );
      return;
    }

    const resend = await import('resend');
    const { Resend } = resend;
    const resendClient = new Resend(apiKey);

    try {
      await resendClient.emails.send({
        from: 'onboarding@resend.dev',
        to: email,
        subject: `${inviterName} invited you to join ${orgName}`,
        html: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #4F46E5;">You're invited!</h2>
            <p>${inviterName} has invited you to join <strong>${orgName}</strong> on Serenity.</p>
            <a href="${inviteUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">Join ${orgName}</a>
            <p style="color: #666; font-size: 14px;">This invitation expires in 7 days.</p>
          </div>
        </body>
        </html>
      `,
      });
    } catch (error) {
      this.logger.error('Error sending email', error);
    }
  }
}
