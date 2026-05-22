import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import type Mail from 'nodemailer/lib/mailer';

import type { MailConfig } from '@/config/configuration';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Mail;

  constructor(private readonly config: ConfigService) {
    const mailCfg = this.config.get<MailConfig>('mail');
    if (mailCfg?.host) {
      this.transporter = nodemailer.createTransport({
        host: mailCfg.host,
        port: mailCfg.port,
        auth: { user: mailCfg.user, pass: mailCfg.pass },
      });
    } else {
      // Dev: use Ethereal test account placeholder
      this.transporter = nodemailer.createTransport({ jsonTransport: true });
      this.logger.warn('SMTP not configured — emails will be logged only in dev.');
    }
  }

  private get from(): string {
    return this.config.get<MailConfig>('mail')?.from ?? 'Carnage <no-reply@carnage.lk>';
  }

  async sendOrderConfirmation(to: string, orderNumber: string, total: number): Promise<void> {
    await this.send({
      to,
      subject: `Your Carnage order ${orderNumber} is confirmed`,
      html: `
        <h2>Order Confirmed ✓</h2>
        <p>Hi there,</p>
        <p>Your order <strong>${orderNumber}</strong> has been received and is being processed.</p>
        <p>Total: <strong>LKR ${total.toFixed(2)}</strong></p>
        <p>We'll email you when it ships. Thank you for shopping with Carnage!</p>
      `,
    });
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const clientUrl = this.config.get<string>('app.clientUrl') ?? 'http://localhost:3000';
    const link = `${clientUrl}/reset-password?token=${token}`;
    await this.send({
      to,
      subject: 'Reset your Carnage password',
      html: `
        <h2>Password Reset</h2>
        <p>Click the link below to reset your password. This link expires in 30 minutes.</p>
        <p><a href="${link}">${link}</a></p>
        <p>If you didn't request this, ignore this email.</p>
      `,
    });
  }

  async sendEmailVerification(to: string, token: string): Promise<void> {
    const clientUrl = this.config.get<string>('app.clientUrl') ?? 'http://localhost:3000';
    const link = `${clientUrl}/verify-email?token=${token}`;
    await this.send({
      to,
      subject: 'Verify your Carnage email',
      html: `<h2>Verify your email</h2><p><a href="${link}">Click here to verify</a></p>`,
    });
  }

  async sendOrderStatusUpdate(
    to: string,
    orderNumber: string,
    status: string,
  ): Promise<void> {
    await this.send({
      to,
      subject: `Your Carnage order ${orderNumber} — status update`,
      html: `<h2>Order Update</h2><p>Your order <strong>${orderNumber}</strong> status is now: <strong>${status}</strong>.</p>`,
    });
  }

  private async send(options: Mail.Options): Promise<void> {
    try {
      await this.transporter.sendMail({ from: this.from, ...options });
    } catch (err) {
      this.logger.error(`Failed to send email to ${String(options.to)}: ${String(err)}`);
    }
  }
}
