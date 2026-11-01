import { describe, expect, test } from 'vitest';
import { schoolPeople, type SchoolParticipantRow } from './schoolPeople';

const user = (id: string, givenName: string, familyName: string) => ({ id, givenName, familyName });

describe('schoolPeople', () => {
	test('reads each person as their registration, by family name', () => {
		const rows: SchoolParticipantRow[] = [
			{
				didAttend: false,
				user: user('s', 'Sam', 'Zeller'),
				conferenceSupervisor: { id: 'sup' }
			},
			{
				didAttend: true,
				user: user('d', 'Dana', 'Albers'),
				delegationMember: {
					isHeadDelegate: true,
					delegation: { applied: true, assignedRoleId: 'role' }
				}
			},
			{
				didAttend: false,
				user: user('e', 'Eli', 'Albers'),
				delegationMember: { isHeadDelegate: false, delegation: { applied: true } }
			},
			{
				didAttend: false,
				user: user('p', 'Pat', 'Meier'),
				singleParticipant: { applied: false, assignedRoleId: null }
			}
		];
		expect(schoolPeople(rows)).toEqual([
			{
				userId: 'd',
				givenName: 'Dana',
				familyName: 'Albers',
				kind: 'DELEGATION_MEMBER',
				isHeadDelegate: true,
				stage: 'SEATED',
				didAttend: true
			},
			{
				userId: 'e',
				givenName: 'Eli',
				familyName: 'Albers',
				kind: 'DELEGATION_MEMBER',
				isHeadDelegate: false,
				stage: 'APPLIED',
				didAttend: false
			},
			{
				userId: 'p',
				givenName: 'Pat',
				familyName: 'Meier',
				kind: 'SINGLE_PARTICIPANT',
				isHeadDelegate: false,
				stage: 'REGISTERED',
				didAttend: false
			},
			{
				userId: 's',
				givenName: 'Sam',
				familyName: 'Zeller',
				kind: 'SUPERVISOR',
				isHeadDelegate: false,
				didAttend: false
			}
		]);
	});

	test('leaves out participant rows without a registration', () => {
		expect(schoolPeople([{ didAttend: false, user: user('x', 'X', 'Y') }])).toEqual([]);
	});
});
