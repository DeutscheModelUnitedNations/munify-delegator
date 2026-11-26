import { describe, expect, test } from 'vitest';
import { functionFits, inboxReaches, messagePreview, writeRefusal } from './chat';

describe('inboxReaches', () => {
	test('participant care reaches everybody, seated or not', () => {
		expect(inboxReaches({ inbox: 'PARTICIPANT_CARE', committeeId: null, person: null })).toBe(true);
	});

	test('the trusted persons reach everybody, seated or not, before the release too', () => {
		expect(inboxReaches({ inbox: 'TRUSTED_PERSON', committeeId: null, person: null })).toBe(true);
		expect(
			inboxReaches({ inbox: 'TRUSTED_PERSON', committeeId: null, person: { committeeId: 'ga' } })
		).toBe(true);
	});

	test("a committee's chairs and consultants reach the people seated there", () => {
		const person = { committeeId: 'ga' };
		expect(inboxReaches({ inbox: 'CHAIR', committeeId: 'ga', person })).toBe(true);
		expect(inboxReaches({ inbox: 'CONSULTANT', committeeId: 'sc', person })).toBe(false);
	});

	test('people seated without a committee are reached by every committee', () => {
		expect(inboxReaches({ inbox: 'CHAIR', committeeId: 'ga', person: { committeeId: null } })).toBe(
			true
		);
	});

	test('nobody without a seat is reached by a committee inbox', () => {
		expect(inboxReaches({ inbox: 'CHAIR', committeeId: 'ga', person: null })).toBe(false);
	});
});

describe('writeRefusal', () => {
	const open = {
		kind: 'DIRECT' as const,
		side: 'PARTICIPANT' as const,
		messagingEnabled: true,
		assignmentReleased: true,
		writerSeated: true,
		writerSuspended: false,
		counterpartSeated: true,
		blocked: false
	};

	test('two seated participants write each other once the roles are released', () => {
		expect(writeRefusal(open)).toBeNull();
		expect(writeRefusal({ ...open, assignmentReleased: false })).toBe('NOT_RELEASED');
	});

	test('the switch only closes chats between participants of different delegations', () => {
		const off = { ...open, messagingEnabled: false };
		expect(writeRefusal(off)).toBe('DISABLED');
		expect(writeRefusal({ ...off, kind: 'TEAM' })).toBeNull();
		expect(writeRefusal({ ...off, kind: 'TEAM', side: 'TEAM' })).toBeNull();
		expect(writeRefusal({ ...off, kind: 'DELEGATION' })).toBeNull();
	});

	test('a suspended or blocked participant cannot write to other participants', () => {
		expect(writeRefusal({ ...open, writerSuspended: true })).toBe('SUSPENDED');
		expect(writeRefusal({ ...open, blocked: true })).toBe('BLOCKED');
		expect(writeRefusal({ ...open, kind: 'DELEGATION', writerSuspended: true })).toBe('SUSPENDED');
	});

	test('a chat with somebody who lost their seat is closed', () => {
		expect(writeRefusal({ ...open, counterpartSeated: false })).toBe('NOT_SEATED');
		expect(writeRefusal({ ...open, writerSeated: false })).toBe('NOT_SEATED');
	});

	test("a delegation's group is open from the registration on, and closes for a rejected one", () => {
		const group = { ...open, kind: 'DELEGATION' as const, messagingEnabled: false };
		const applying = { ...group, assignmentReleased: false, writerSeated: false };
		expect(writeRefusal(applying)).toBeNull();
		expect(writeRefusal(group)).toBeNull();
		expect(writeRefusal({ ...group, writerSeated: false })).toBe('NOT_SEATED');
	});

	test('the team is reached whatever the switch, the seat, the release or a suspension say', () => {
		const stuck = {
			...open,
			kind: 'TEAM' as const,
			messagingEnabled: false,
			assignmentReleased: false,
			writerSeated: false,
			writerSuspended: true
		};
		expect(writeRefusal(stuck)).toBeNull();
		expect(writeRefusal({ ...stuck, side: 'TEAM' })).toBeNull();
		expect(writeRefusal({ ...stuck, assignmentReleased: true })).toBeNull();
	});

	test('participant care reading a reported chat does not write in it', () => {
		expect(writeRefusal({ ...open, side: 'REVIEW' })).toBe('REVIEW');
	});
});

describe('messagePreview', () => {
	test('puts a message on one line and cuts a long one', () => {
		expect(messagePreview('Hallo\n\n  zusammen')).toBe('Hallo zusammen');
		const long = messagePreview('x'.repeat(200), 20);
		expect(long).toHaveLength(20);
		expect(long.endsWith('…')).toBe(true);
	});
});

describe('functionFits', () => {
	test('a trusted person belongs to the whole conference', () => {
		expect(functionFits({ kind: 'TRUSTED_PERSON', committeeId: null })).toBe(true);
		expect(functionFits({ kind: 'TRUSTED_PERSON', committeeId: 'ga' })).toBe(false);
	});

	test("chairs and consultants are a committee's", () => {
		expect(functionFits({ kind: 'CHAIR', committeeId: 'ga' })).toBe(true);
		expect(functionFits({ kind: 'CONSULTANT', committeeId: null })).toBe(false);
	});
});

describe('custom roles', () => {
	test('whoever supports a custom role looks after that role, not a committee', () => {
		expect(functionFits({ kind: 'ROLE_SUPPORT', committeeId: null, roleId: 'press' })).toBe(true);
		expect(functionFits({ kind: 'ROLE_SUPPORT', committeeId: null })).toBe(false);
		expect(functionFits({ kind: 'ROLE_SUPPORT', committeeId: 'ga', roleId: 'press' })).toBe(false);
		expect(functionFits({ kind: 'CHAIR', committeeId: 'ga', roleId: 'press' })).toBe(false);
		expect(functionFits({ kind: 'TRUSTED_PERSON', committeeId: null, roleId: 'press' })).toBe(
			false
		);
	});

	test("a role's inbox reaches the people holding that role only", () => {
		const inbox = { inbox: 'ROLE_SUPPORT' as const, committeeId: null, roleId: 'press' };
		expect(inboxReaches({ ...inbox, person: { committeeId: null, roleId: 'press' } })).toBe(true);
		expect(inboxReaches({ ...inbox, person: { committeeId: null, roleId: 'jury' } })).toBe(false);
		expect(inboxReaches({ ...inbox, person: { committeeId: 'ga', roleId: 'n-de' } })).toBe(false);
		expect(inboxReaches({ ...inbox, person: null })).toBe(false);
	});
});

describe('writeRefusal in a group', () => {
	const group = {
		kind: 'COMMITTEE' as const,
		side: 'PARTICIPANT' as const,
		messagingEnabled: false,
		groupChatsEnabled: true,
		assignmentReleased: true,
		writerSeated: true,
		writerSuspended: false,
		counterpartSeated: false,
		blocked: false
	};

	test('people seated there write while the groups are open, whatever the messaging switch', () => {
		expect(writeRefusal(group)).toBeNull();
		expect(writeRefusal({ ...group, kind: 'ROLE' })).toBeNull();
	});

	test('the groups wait for their switch and the release, and close for those not seated', () => {
		expect(writeRefusal({ ...group, groupChatsEnabled: false })).toBe('GROUPS_DISABLED');
		expect(writeRefusal({ ...group, assignmentReleased: false })).toBe('NOT_RELEASED');
		expect(writeRefusal({ ...group, writerSeated: false })).toBe('NOT_SEATED');
		expect(writeRefusal({ ...group, writerSuspended: true })).toBe('SUSPENDED');
	});

	test('the team in a group writes any time', () => {
		expect(
			writeRefusal({ ...group, side: 'TEAM', groupChatsEnabled: false, assignmentReleased: false })
		).toBeNull();
	});
});
