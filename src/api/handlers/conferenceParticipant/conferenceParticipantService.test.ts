import { describe, expect, it, vi } from 'vitest';

vi.mock('#api/db/db', async () => ({ db: {}, schema: await import('#api/db/schema/index') }));
vi.mock('#api/pubsub', () => ({}));
vi.mock('#api/handlers/school/schoolService', () => ({}));

const { statusFields } = await import('./conferenceParticipantService');

describe('statusFields', () => {
	it('writes the fields given, and null keeps a field like leaving it out', () => {
		expect(
			statusFields({
				termsAndConditions: 'DONE',
				guardianConsent: null,
				mediaConsentStatus: 'PARTIALLY_ALLOWED',
				paymentStatus: 'DONE',
				didAttend: false,
				accessCardId: 'card'
			})
		).toEqual({
			termsAndConditions: 'DONE',
			guardianConsent: undefined,
			mediaConsent: undefined,
			mediaConsentStatus: 'PARTIALLY_ALLOWED',
			paymentStatus: 'DONE',
			didAttend: false
		});
	});
});
