/**
 * Options for sending an email
 */
export interface EmailOptions {
	to: string | string[];
	subject: string;
	html: string;
	text?: string;
	replyTo?: string;
}

/**
 * Result of sending an email
 */
export interface SendEmailResult {
	success: boolean;
	messageId?: string;
	error?: string;
}
