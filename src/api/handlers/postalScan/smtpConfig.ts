import {
	SCANNER_SMTP_HOST,
	SCANNER_SMTP_PORT,
	SCANNER_SMTP_PUBLIC_PORT,
	SCANNER_SMTP_TLS
} from '$app/env/private';

/**
 * Where scanners send their emails, as a person types it into one; null when this instance takes
 * none (`SCANNER_SMTP_PORT` and `SCANNER_SMTP_HOST` unset).
 */
export function smtpDelivery() {
	if (!SCANNER_SMTP_PORT || !SCANNER_SMTP_HOST) return null;
	return {
		host: SCANNER_SMTP_HOST,
		port: SCANNER_SMTP_PUBLIC_PORT ?? SCANNER_SMTP_PORT,
		// a proxy ends TLS that began with the connection
		security: SCANNER_SMTP_TLS === 'starttls' ? 'STARTTLS' : 'TLS'
	};
}
