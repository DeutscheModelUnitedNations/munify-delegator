import { describe, expect, it } from 'vitest';
import { answersInbox, oldestUnreadPerMember, type UnreadInbox } from './unreadInboxes';

const at = (minute: number) => new Date(Date.UTC(2026, 0, 1, 12, minute));

const care: UnreadInbox = {
	inbox: 'PARTICIPANT_CARE',
	committeeId: null,
	trustedUserId: null,
	messageId: 'care-message',
	writtenAt: at(10)
};
const chairs: UnreadInbox = {
	inbox: 'CHAIR',
	committeeId: 'ga',
	trustedUserId: null,
	messageId: 'chair-message',
	writtenAt: at(5)
};

const carer = { id: 'carer', userId: 'u-carer', role: 'PARTICIPANT_CARE', functions: [] };
const chair = {
	id: 'chair',
	userId: 'u-chair',
	role: 'MEMBER',
	functions: [{ committeeId: 'ga', kind: 'CHAIR' }]
};
const consultant = {
	id: 'consultant',
	userId: 'u-consultant',
	role: 'MEMBER',
	functions: [{ committeeId: 'ga', kind: 'CONSULTANT' }]
};

describe('answersInbox', () => {
	it('gives the participant care inbox to the care roles', () => {
		expect(answersInbox({ member: carer, inbox: care })).toBe(true);
		expect(answersInbox({ member: chair, inbox: care })).toBe(false);
	});

	it('gives a committee inbox to whoever holds that function there', () => {
		expect(answersInbox({ member: chair, inbox: chairs })).toBe(true);
		expect(answersInbox({ member: consultant, inbox: chairs })).toBe(false);
		expect(answersInbox({ member: chair, inbox: { ...chairs, committeeId: 'sc' } })).toBe(false);
		expect(answersInbox({ member: carer, inbox: chairs })).toBe(false);
	});
});

describe('trusted persons', () => {
	const shared: UnreadInbox = {
		inbox: 'TRUSTED_PERSON',
		committeeId: null,
		trustedUserId: null,
		messageId: 'shared-message',
		writtenAt: at(20)
	};
	const anna = {
		id: 'anna',
		userId: 'u-anna',
		role: 'MEMBER',
		functions: [{ committeeId: null, kind: 'TRUSTED_PERSON' }]
	};
	const ben = { ...anna, id: 'ben', userId: 'u-ben' };
	const toAnna: UnreadInbox = { ...shared, trustedUserId: 'u-anna', messageId: 'anna-message' };

	it('share the inbox written to all of them', () => {
		expect(answersInbox({ member: anna, inbox: shared })).toBe(true);
		expect(answersInbox({ member: ben, inbox: shared })).toBe(true);
	});

	it('read a chat written to one of them alone', () => {
		expect(answersInbox({ member: anna, inbox: toAnna })).toBe(true);
		expect(answersInbox({ member: ben, inbox: toAnna })).toBe(false);
	});

	it('are not participant care, nor is participant care one of them', () => {
		expect(answersInbox({ member: carer, inbox: shared })).toBe(false);
		expect(answersInbox({ member: carer, inbox: toAnna })).toBe(false);
		expect(answersInbox({ member: anna, inbox: care })).toBe(false);
	});
});

describe('oldestUnreadPerMember', () => {
	it('hands every member answering an inbox its unread message', () => {
		expect(oldestUnreadPerMember({ inboxes: [care, chairs], members: [carer, chair] })).toEqual([
			{ messageId: 'care-message', writtenAt: at(10), reader: { teamMemberId: 'carer' } },
			{ messageId: 'chair-message', writtenAt: at(5), reader: { teamMemberId: 'chair' } }
		]);
	});

	it('keeps the oldest across the inboxes one member answers', () => {
		const both = { ...carer, functions: chair.functions };
		for (const inboxes of [
			[care, chairs],
			[chairs, care]
		]) {
			expect(oldestUnreadPerMember({ inboxes, members: [both] })).toEqual([
				{ messageId: 'chair-message', writtenAt: at(5), reader: { teamMemberId: 'carer' } }
			]);
		}
	});

	it('owes nothing to a member who answers no unread inbox', () => {
		expect(oldestUnreadPerMember({ inboxes: [chairs], members: [carer, consultant] })).toEqual([]);
		expect(oldestUnreadPerMember({ inboxes: [], members: [carer] })).toEqual([]);
	});
});
