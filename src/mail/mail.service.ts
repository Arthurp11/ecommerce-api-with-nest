import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    this.logger.log(
      `[stub] Password reset requested for ${email}. Token: ${resetToken} (replace MailService with a real provider, e.g. nodemailer/SES/SendGrid, before shipping to production).`,
    );
  }
}
