import type { PageServerLoad } from './$types';
import { configPublic } from '$config/public';

// Validate scenario with proper type narrowing instead of casting
function isValidScenario(value: string | null): value is 'new' | 'change' {
	return value === 'new' || value === 'change';
}

// Sanitize email to prevent XSS - only allow safe characters for masked emails
// Masked emails should look like: "jo***@example.com"
function sanitizeMaskedEmail(email: string | null): string {
	if (!email) return '***@***';

	// Only allow alphanumeric, @, ., -, _, and *
	const sanitized = email.replace(/[^a-zA-Z0-9@.\-_*]/g, '');

	// Validate it looks like a masked email (has @ and reasonable length)
	if (!sanitized.includes('@') || sanitized.length > 100) {
		return '***@***';
	}

	return sanitized;
}

// Sanitize reference ID - only allow alphanumeric characters
function sanitizeRefId(ref: string | null): string {
	if (!ref) return 'unknown';
	return ref.replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);
}

export const load: PageServerLoad = async ({ url }) => {
	const scenarioParam = url.searchParams.get('scenario');
	const email = url.searchParams.get('email');
	const ref = url.searchParams.get('ref');
	const existingEmail = url.searchParams.get('existingEmail');

	return {
		scenario: isValidScenario(scenarioParam) ? scenarioParam : 'new',
		maskedEmail: sanitizeMaskedEmail(email),
		referenceId: sanitizeRefId(ref),
		maskedExistingEmail: existingEmail ? sanitizeMaskedEmail(existingEmail) : null,
		supportEmail: configPublic.PUBLIC_SUPPORT_EMAIL
	};
};
