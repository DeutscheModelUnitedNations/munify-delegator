import { describe, expect, it } from 'vitest';
import { participantFacingStatus } from './administrativeStatus';

describe('participantFacingStatus', () => {
	it('shows a flag for the team as still open', () => {
		expect(participantFacingStatus('NEEDS_HUMAN_REVIEW')).toBe('PENDING');
	});

	it('keeps every other status', () => {
		expect(participantFacingStatus('DONE')).toBe('DONE');
		expect(participantFacingStatus('PENDING')).toBe('PENDING');
		expect(participantFacingStatus('PROBLEM')).toBe('PROBLEM');
	});
});
