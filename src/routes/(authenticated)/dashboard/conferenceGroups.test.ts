import { describe, expect, test } from 'vitest';
import { groupConferencesByState } from './conferenceGroups';

const conference = (
	id: string,
	state: Parameters<typeof groupConferencesByState>[0][number]['state'],
	day: number
) => ({
	id,
	state,
	startConference: new Date(2026, 0, day)
});

describe('groupConferencesByState', () => {
	test('orders the groups from running to past and drops empty ones', () => {
		const groups = groupConferencesByState([
			conference('old', 'POST', 1),
			conference('soon', 'PRE', 2),
			conference('now', 'ACTIVE', 3)
		]);
		expect(groups.map((group) => group.key)).toEqual(['active', 'upcoming', 'past']);
	});

	test('lists the nearest conference first, except among past ones', () => {
		const [upcoming, past] = groupConferencesByState([
			conference('later', 'PRE', 20),
			conference('sooner', 'PRE', 10),
			conference('older', 'POST', 1),
			conference('newer', 'POST', 5)
		]);
		expect(upcoming.conferences.map((c) => c.id)).toEqual(['sooner', 'later']);
		expect(past.conferences.map((c) => c.id)).toEqual(['newer', 'older']);
	});
});
