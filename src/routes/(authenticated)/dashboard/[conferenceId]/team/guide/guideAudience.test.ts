import { expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { audienceLabel } from './guideAudience';

const roles = [
	{ id: 'press', name: 'Presse' },
	{ id: 'judge', name: 'IGH' }
];

test('names each audience, custom roles by their names', () => {
	expect(audienceLabel({ audience: { type: 'everyone' }, roles })).toBe(m.guideAudienceEveryone());
	expect(audienceLabel({ audience: { type: 'delegates' }, roles })).toBe(
		m.guideAudienceDelegates()
	);
	expect(audienceLabel({ audience: { type: 'nonStateActors' }, roles })).toBe(
		m.guideAudienceNonStateActors()
	);
	expect(audienceLabel({ audience: { type: 'supervisors' }, roles })).toBe(
		m.guideAudienceSupervisors()
	);
	expect(
		audienceLabel({ audience: { type: 'customRoles', roleIds: ['judge', 'press', 'gone'] }, roles })
	).toBe('IGH, Presse, ?');
});
