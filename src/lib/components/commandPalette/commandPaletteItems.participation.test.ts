import { describe, expect, test } from 'vitest';
import { userParticipationType } from './commandPaletteItems';

const none = {
	teamMember: [],
	conferenceSupervisor: [],
	delegationMemberships: [],
	singleParticipant: [],
	waitingListEntry: []
};

describe('userParticipationType', () => {
	test('names the role the user holds', () => {
		expect(userParticipationType({ ...none, singleParticipant: [{}] })).toBe('single');
		expect(userParticipationType({ ...none, delegationMemberships: [{}] })).toBe('delegation');
		expect(userParticipationType({ ...none, conferenceSupervisor: [{}] })).toBe('supervisor');
	});
	test('team wins over every other role', () => {
		expect(userParticipationType({ ...none, teamMember: [{}], singleParticipant: [{}] })).toBe(
			'team'
		);
	});
	test('a waiting-list entry is the weakest role', () => {
		expect(userParticipationType({ ...none, waitingListEntry: [{}] })).toBe('waitingList');
		expect(
			userParticipationType({ ...none, waitingListEntry: [{}], singleParticipant: [{}] })
		).toBe('single');
	});
	test('is unknown without a role', () => {
		expect(userParticipationType(none)).toBe('unknown');
	});
});
