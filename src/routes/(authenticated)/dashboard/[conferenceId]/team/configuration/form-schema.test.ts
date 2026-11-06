import { describe, expect, it } from 'vitest';
import { limitArgs } from './form-schema';

describe('limitArgs', () => {
	it('lifts an emptied limit and keeps a set one', () => {
		expect(
			limitArgs({
				maxSeatsPerSchool: undefined,
				participantMinAge: 15,
				participantMaxAge: null,
				supervisorMinAge: 21
			})
		).toEqual({
			maxSeatsPerSchool: null,
			participantMinAge: 15,
			participantMaxAge: null,
			supervisorMinAge: 21
		});
	});
});
