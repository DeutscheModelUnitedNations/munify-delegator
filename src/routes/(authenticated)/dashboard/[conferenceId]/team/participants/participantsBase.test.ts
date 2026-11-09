import { describe, expect, it } from 'vitest';
import { participantsBase } from './participantsBase';

describe('participantsBase', () => {
	it('shows only the accepted once the conference is underway', () => {
		expect(participantsBase('PARTICIPANT_REGISTRATION').filter?.items).toEqual([]);
		expect(participantsBase('ACTIVE').filter?.items).toHaveLength(1);
	});
});
