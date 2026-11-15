import { describe, expect, it } from 'vitest';
import { messagesPageState } from './messagesPageState';

const open = { messagingEnabled: true, assignmentReleased: true, takesPart: true, hasChats: false };

describe('messagesPageState', () => {
	it('lets a participant start chats once messaging is on', () => {
		expect(messagesPageState(open)).toEqual({ closed: null, canStart: true, beforeRelease: false });
	});

	it('points out that only the team is reachable before the release', () => {
		expect(messagesPageState({ ...open, assignmentReleased: false }).beforeRelease).toBe(true);
	});

	it('says why there is nothing to see while messaging is off or the caller takes no part', () => {
		expect(messagesPageState({ ...open, messagingEnabled: false })).toEqual({
			closed: 'disabled',
			canStart: false,
			beforeRelease: false
		});
		expect(messagesPageState({ ...open, takesPart: false })).toEqual({
			closed: 'noPart',
			canStart: false,
			beforeRelease: false
		});
		expect(messagesPageState({ ...open, messagingEnabled: false, takesPart: false }).closed).toBe(
			'disabled'
		);
	});

	it('keeps earlier chats readable either way, without starting new ones', () => {
		expect(
			messagesPageState({
				...open,
				messagingEnabled: false,
				assignmentReleased: false,
				hasChats: true
			})
		).toEqual({ closed: null, canStart: false, beforeRelease: false });
	});
});
