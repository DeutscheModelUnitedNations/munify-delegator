import valiator from 'validator';

/**
 * Additional phone number patterns not supported by the validator library
 * These are added based on official telecommunications authority formats
 */
const additionalPhonePatterns: Record<string, RegExp> = {
	// Croatian phone numbers
	// Format: +385 9X XXX XXXX (9 digits after country code)
	// Mobile prefixes: 90-99
	'hr-HR': /^(\+?385)9[0-9]\d{7}$/
};

/**
 * Validates a phone number using the validator library and additional custom patterns
 * @param phoneNumber - The phone number to validate (should be cleaned of spaces and dashes)
 * @param strictMode - If true, requires the phone number to start with '+'
 * @returns true if the phone number is valid, false otherwise
 */
export function isValidPhoneNumber(phoneNumber: string, strictMode = true): boolean {
	// If strictMode is enabled, check if the number starts with '+'
	if (strictMode && !phoneNumber.startsWith('+')) {
		return false;
	}

	// First, try the validator library
	if (valiator.isMobilePhone(phoneNumber, 'any', { strictMode })) {
		return true;
	}

	// If validator fails, check against our additional patterns
	for (const pattern of Object.values(additionalPhonePatterns)) {
		if (pattern.test(phoneNumber)) {
			return true;
		}
	}

	return false;
}
