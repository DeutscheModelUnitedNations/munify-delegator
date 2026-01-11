import { configPrivate } from '$config/private';

/**
 * Email configuration derived from environment variables
 */
export const emailConfig = {
	host: configPrivate.SMTP_HOST,
	port: configPrivate.SMTP_PORT,
	secure: configPrivate.SMTP_SECURE,
	auth:
		configPrivate.SMTP_USER && configPrivate.SMTP_PASSWORD
			? {
					user: configPrivate.SMTP_USER,
					pass: configPrivate.SMTP_PASSWORD
				}
			: undefined,
	from: {
		address: configPrivate.SMTP_FROM_ADDRESS,
		name: configPrivate.SMTP_FROM_NAME
	}
};
