import { describe, expect, it } from 'vitest';
import { supervisorPreview, type PreviewedSupervisor } from './supervisorPreview';

const ownSchool = { id: 's1', name: 'Goethe-Gymnasium', city: 'Berlin' };
const otherSchool = { id: 's2', name: 'Schiller-Schule', city: null };

const supervisor = (overrides: Partial<PreviewedSupervisor> = {}): PreviewedSupervisor => ({
	user: { givenName: 'Ada', familyName: 'Lovelace' },
	school: ownSchool,
	participant: { school: otherSchool },
	...overrides
});

describe('supervisorPreview', () => {
	it('shows the name and the school the registration names', () => {
		expect(supervisorPreview(supervisor(), 's1')).toEqual({
			given_name: 'Ada',
			family_name: 'Lovelace',
			school_name: 'Goethe-Gymnasium',
			school_city: 'Berlin',
			different_school: false
		});
	});

	it("falls back to the person's own school", () => {
		const preview = supervisorPreview(supervisor({ school: null }), 's1');
		expect(preview.school_name).toBe('Schiller-Schule');
		expect(preview.school_city).toBeNull();
		expect(preview.different_school).toBe(true);
	});

	it('shows nothing it does not know', () => {
		expect(
			supervisorPreview(supervisor({ user: null, school: null, participant: null }), 's1')
		).toEqual({
			given_name: null,
			family_name: null,
			school_name: null,
			school_city: null,
			different_school: false
		});
	});

	it('does not warn when the caller has no school', () => {
		expect(supervisorPreview(supervisor(), null).different_school).toBe(false);
		expect(supervisorPreview(supervisor(), undefined).different_school).toBe(false);
	});
});
