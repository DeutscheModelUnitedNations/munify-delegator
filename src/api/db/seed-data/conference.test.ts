import { describe, expect, test } from 'vitest';
import { makeSeedConference } from './conference';
import { conferenceSettingsFormSchema } from '../../../routes/(authenticated)/management/[conferenceId]/configuration/form-schema';

/**
 * A seeded conference has to be editable. The settings form validates more strictly than the
 * columns do (a 22-character IBAN, an 11-character BIC, a positive fee), so faker values that are
 * merely plausible would leave the configuration page unable to save on a fresh `db:seed:dev`.
 */
describe('makeSeedConference', () => {
	test('produces conferences the settings form accepts', () => {
		for (let i = 0; i < 100; i++) {
			const conference = makeSeedConference();

			// The form only covers the columns it edits, and the upload fields hold a File rather
			// than a stored value. Columns the seed leaves to their database default are filled in
			// here, because that is what the form will read back from the row.
			const stored: Record<string, unknown> = {
				registrationDeadlineGracePeriodMinutes: 30,
				...Object.fromEntries(
					Object.entries(conference).filter(([, value]) => value !== null && value !== undefined)
				)
			};

			const uploadFields = new Set(['image', 'emblem', 'logo']);
			const values = Object.fromEntries(
				Object.keys(conferenceSettingsFormSchema.shape)
					.filter((key) => !uploadFields.has(key) && key in stored)
					.map((key) => [key, stored[key]])
			);

			const result = conferenceSettingsFormSchema.safeParse(values);
			expect(
				result.success
					? []
					: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`)
			).toEqual([]);
		}
	});
});
