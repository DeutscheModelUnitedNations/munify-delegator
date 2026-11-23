import { expect, test } from 'vitest';
import { m } from '#lib/paraglide/messages';
import { audienceLabel, topicReadersLabel } from './guideAudience';

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

test('names the readers of the topic overview, or says there are none', () => {
	expect(
		topicReadersLabel({
			readers: { nonStateActors: true, supervisors: true, roleIds: ['judge'] },
			roles
		})
	).toBe(`${m.guideAudienceNonStateActors()}, IGH, ${m.guideAudienceSupervisors()}`);
	expect(
		topicReadersLabel({
			readers: { nonStateActors: false, supervisors: false, roleIds: [] },
			roles
		})
	).toBe(m.guideTopicOverviewNobody());
});
