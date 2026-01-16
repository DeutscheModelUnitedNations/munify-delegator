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

/**
 * Props for the NewReviewEmail template
 */
export interface NewReviewEmailProps {
	recipientName: string;
	paperTitle: string;
	paperType: string;
	reviewerName: string;
	reviewerEmail: string;
	newStatus: string;
	conferenceTitle: string;
	paperUrl: string;
}

/**
 * Props for the DelegationMessageEmail template
 */
export interface DelegationMessageEmailProps {
	senderLabel: string;
	subject: string;
	messageBody: string;
	conferenceTitle: string;
	replyUrl: string;
}
