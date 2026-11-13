import { describe, expect, test } from 'vitest';
import { functionFitsCommittee, inboxReaches, messagePreview, writeRefusal } from './chat';

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

	test('nobody writes while messaging is off, the team included', () => {
		expect(writeRefusal({ ...open, messagingEnabled: false })).toBe('DISABLED');
		expect(writeRefusal({ ...open, kind: 'TEAM', side: 'TEAM', messagingEnabled: false })).toBe(
			'DISABLED'
		);
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

	test('the team is reached whatever the seat, the release or a suspension say', () => {
		const stuck = {
			...open,
			kind: 'TEAM' as const,
			assignmentReleased: false,
			writerSeated: false,
			writerSuspended: true
		};
		expect(writeRefusal(stuck)).toBeNull();
		expect(writeRefusal({ ...stuck, side: 'TEAM' })).toBeNull();
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

describe('functionFitsCommittee', () => {
	test('a trusted person belongs to the whole conference', () => {
		expect(functionFitsCommittee({ kind: 'TRUSTED_PERSON', committeeId: null })).toBe(true);
		expect(functionFitsCommittee({ kind: 'TRUSTED_PERSON', committeeId: 'ga' })).toBe(false);
	});

	test("chairs and consultants are a committee's", () => {
		expect(functionFitsCommittee({ kind: 'CHAIR', committeeId: 'ga' })).toBe(true);
		expect(functionFitsCommittee({ kind: 'CONSULTANT', committeeId: null })).toBe(false);
	});
});
