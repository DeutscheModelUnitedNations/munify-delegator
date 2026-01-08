import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { emailConfig } from './emailConfig';
import type { EmailOptions, SendEmailResult } from './types';

/**
 * Email service for sending transactional emails via SMTP
 *
 * This is a singleton service that manages a nodemailer transporter
 * and provides methods for sending emails.
 */
class EmailService {
	private transporter: Transporter | null = null;

	/**
	 * Get or create the nodemailer transporter
	 */
	private getTransporter(): Transporter {
		if (!this.transporter) {
			this.transporter = nodemailer.createTransport({
				host: emailConfig.host,
				port: emailConfig.port,
				secure: emailConfig.secure,
				auth: emailConfig.auth
			});
		}
		return this.transporter;
	}

	/**
	 * Send an email
	 *
	 * @param options - Email options including recipient, subject, and content
	 * @returns Result indicating success or failure with optional message ID or error
	 */
	async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
		try {
			const transporter = this.getTransporter();

			const result = await transporter.sendMail({
				from: `"${emailConfig.from.name}" <${emailConfig.from.address}>`,
				to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
				subject: options.subject,
				html: options.html,
				text: options.text,
				replyTo: options.replyTo
			});

			return {
				success: true,
				messageId: result.messageId
			};
		} catch (error) {
			console.error('Failed to send email:', error);
			return {
				success: false,
				error: error instanceof Error ? error.message : 'Unknown error'
			};
		}
	}

	/**
	 * Verify the SMTP connection
	 *
	 * @returns true if connection is successful, false otherwise
	 */
	async verifyConnection(): Promise<boolean> {
		try {
			const transporter = this.getTransporter();
			await transporter.verify();
			return true;
		} catch (error) {
			console.error('SMTP connection verification failed:', error);
			return false;
		}
	}
}

// Export singleton instance
export const emailService = new EmailService();
