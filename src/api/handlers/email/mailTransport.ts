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
import { logger } from '#lib/logger';

/** One rendered mail to send. */
interface OutgoingEmail {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
}

/** How sending went: the provider's message id, or why it failed. */
interface SendEmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}

/**
 * The SMTP connection every mail goes out through (`emailDelivery.ts` is its only user). The
 * transporter is created on the first mail, so a process that sends none never connects.
 */
function createMailTransport() {
	let transporter: Transporter | null = null;

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
		/** Sends one mail; a failure is logged and answered, never thrown. */
		async sendEmail(options: OutgoingEmail): Promise<SendEmailResult> {
			try {
				const result = await getTransporter().sendMail({
					from: `"${SMTP_FROM_NAME}" <${SMTP_FROM_ADDRESS}>`,
					to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
					subject: options.subject,
					html: options.html,
					text: options.text,
					replyTo: options.replyTo
				});
				return { success: true, messageId: result.messageId };
			} catch (error) {
				logger.error('Failed to send email', error);
				return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
			}
		}
	};
}

export const mailTransport = createMailTransport();
