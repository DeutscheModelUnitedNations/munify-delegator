import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
	SMTP_FROM_ADDRESS,
	SMTP_FROM_NAME,
	SMTP_HOST,
	SMTP_PASSWORD,
	SMTP_PORT,
	SMTP_SECURE,
	SMTP_USER
} from '$app/env/private';
import type { EmailOptions, SendEmailResult } from './types';
import { logger } from '#lib/logger';

/**
 * Email service for sending transactional emails via SMTP
 *
 * This is a singleton service that manages a nodemailer transporter
 * and provides methods for sending emails.
 */
function createEmailService() {
	let transporter: Transporter | null = null;

	/**
	 * Get or create the nodemailer transporter
	 */
	function getTransporter(): Transporter {
		if (!transporter) {
			transporter = nodemailer.createTransport({
				host: SMTP_HOST,
				port: SMTP_PORT,
				secure: SMTP_SECURE,
				auth: SMTP_USER && SMTP_PASSWORD ? { user: SMTP_USER, pass: SMTP_PASSWORD } : undefined
			});
		}
		return transporter;
	}

	return {
		/**
		 * Send an email
		 *
		 * @param options - Email options including recipient, subject, and content
		 * @returns Result indicating success or failure with optional message ID or error
		 */
		async sendEmail(options: EmailOptions): Promise<SendEmailResult> {
			try {
				const result = await getTransporter().sendMail({
					from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_ADDRESS}>`,
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
				logger.error('Failed to send email', error);
				return {
					success: false,
					error: error instanceof Error ? error.message : 'Unknown error'
				};
			}
		},

		/**
		 * Verify the SMTP connection
		 *
		 * @returns true if connection is successful, false otherwise
		 */
		async verifyConnection(): Promise<boolean> {
			try {
				await getTransporter().verify();
				return true;
			} catch (error) {
				logger.error('SMTP connection verification failed', error);
				return false;
			}
		}
	};
}

// Export singleton instance
export const emailService = createEmailService();
