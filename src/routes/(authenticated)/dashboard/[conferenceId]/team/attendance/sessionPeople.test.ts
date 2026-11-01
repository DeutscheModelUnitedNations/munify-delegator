import { describe, expect, test } from 'vitest';
import { sessionPeopleWhere } from './sessionPeople';

describe('sessionPeopleWhere', () => {
	test('without a search, lists the whole session', () => {
		expect(sessionPeopleWhere({ sessionId: 's', search: '  ' })).toEqual({
			sessionId: { eq: 's' }
		});
	});

	test('every word has to match the name, email or access card', () => {
		const where = sessionPeopleWhere({ sessionId: 's', search: ' Ada  Lovelace ' });
		expect(where.sessionId).toEqual({ eq: 's' });
		expect(where.AND).toHaveLength(2);
		expect(where.AND?.[1]).toEqual({
			conferenceParticipant: {
				OR: [
					{
						user: {
							OR: [
								{ givenName: { ilike: '%Lovelace%' } },
								{ familyName: { ilike: '%Lovelace%' } },
								{ email: { ilike: '%Lovelace%' } }
							]
						}
					},
					{ accessCardId: { ilike: '%Lovelace%' } }
				]
			}
		});
	});

	test('matches like wildcards literally', () => {
		const where = sessionPeopleWhere({ sessionId: 's', search: '100%' });
		expect(JSON.stringify(where)).toContain('%100\\\\%%');
	});
});
