// Email service exports
export { emailService } from './emailService';
export { emailConfig } from './emailConfig';
export { sendNewReviewNotification } from './sendNewReviewNotification';
export { renderDelegationMessageEmail } from './delegationMessageTemplates';
export type {
	EmailOptions,
	SendEmailResult,
	NewReviewEmailProps,
	DelegationMessageEmailProps
} from './types';
