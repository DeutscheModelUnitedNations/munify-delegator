import { describe, expect, it } from 'vitest';
import { messagesPageState } from './messagesPageState';

const open = { messagingEnabled: true, assignmentReleased: true, takesPart: true, hasChats: false };

describe('messagesPageState', () => {
	it('lets a participant write to everybody once the roles are out and the switch is on', () => {
		expect(messagesPageState(open)).toEqual({ closed: null, canStart: true, othersClosed: null });
	});

	it('lets a participant start chats with the team and their delegation whatever the switch says', () => {
		const off = messagesPageState({ ...open, messagingEnabled: false, assignmentReleased: false });
		expect(off.closed).toBeNull();
		expect(off.canStart).toBe(true);
	});

	it('says why other delegations are not reachable yet', () => {
		expect(messagesPageState({ ...open, assignmentReleased: false }).othersClosed).toBe(
			'beforeRelease'
		);
		expect(
			messagesPageState({ ...open, assignmentReleased: false, messagingEnabled: false })
				.othersClosed
		).toBe('beforeRelease');
		expect(messagesPageState({ ...open, messagingEnabled: false }).othersClosed).toBe('disabled');
	});

	it('says why there is nothing to see for somebody who takes no part', () => {
		expect(messagesPageState({ ...open, takesPart: false })).toEqual({
			closed: 'noPart',
			canStart: false,
			othersClosed: null
		});
	});

	it('keeps earlier chats readable without starting new ones', () => {
		expect(messagesPageState({ ...open, takesPart: false, hasChats: true })).toEqual({
			closed: null,
			canStart: false,
			othersClosed: null
		});
	});
});
