import { describe, expect, it } from 'vitest';
import { limitArgs } from './form-schema';

describe('limitArgs', () => {
	it('lifts an emptied limit and keeps a set one', () => {
		expect(
			limitArgs({
				maxCollectiveGroupSize: undefined,
				maxGuaranteedSeatsPerForeignSchool: 0,
				participantMinAge: 15,
				participantMaxAge: null,
				supervisorMinAge: 21
			})
		).toEqual({
			maxCollectiveGroupSize: null,
			maxGuaranteedSeatsPerForeignSchool: 0,
			participantMinAge: 15,
			participantMaxAge: null,
			supervisorMinAge: 21
		});
	});
});
