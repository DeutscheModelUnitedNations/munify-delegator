import { describe, expect, it } from 'vitest';
import { CHASE_PRESENCE_SCHEMA_URL, parseLinkedPresence } from './chasePresence';

describe('parseLinkedPresence', () => {
	it('takes the presence the browser received with its dates turned into Dates', () => {
		const parsed = parseLinkedPresence({
			$schema: CHASE_PRESENCE_SCHEMA_URL,
			exportedAt: new Date('2027-03-03T12:00:00Z'),
			conferenceId: 'conf',
			participants: [
				{
					email: 'anna@example.org',
					kind: 'DELEGATE',
					committeeId: 'ga',
					representation: null,
					events: [
						{
							id: 'e1',
							committeeId: 'ga',
							present: true,
							type: 'ROLL_CALL',
							timestamp: new Date('2027-03-02T09:00:00Z')
						}
					]
				}
			]
		});
		expect(parsed.success).toBe(true);
		expect(parsed.data?.participants[0].events[0].timestamp).toBe('2027-03-02T09:00:00.000Z');
	});

	it('refuses what is no presence export', () => {
		expect(parseLinkedPresence(undefined).success).toBe(false);
		expect(parseLinkedPresence({ participants: 'x' }).success).toBe(false);
	});
});
