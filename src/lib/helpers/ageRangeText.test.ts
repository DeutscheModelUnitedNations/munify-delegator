import { describe, expect, it, vi } from 'vitest';

vi.mock('#lib/paraglide/messages', () => ({
	m: {
		ageRangeBetween: ({ min, max }: { min: number; max: number }) => `${min}-${max}`,
		ageRangeFrom: ({ min }: { min: number }) => `${min}+`,
		ageRangeUpTo: ({ max }: { max: number }) => `-${max}`,
		ageRangeParticipants: ({ range }: { range: string }) => `participants ${range}`,
		ageRangeSupervisors: ({ min }: { min: number }) => `supervisors ${min}+`,
		ageNoticeSupervisorRange: ({ min, age }: { min: number; age: number }) =>
			`supervisor ${min}, is ${age}`,
		ageNoticeParticipantRange: ({ range, age }: { range: string; age: number }) =>
			`participant ${range}, is ${age}`
	}
}));

const { ageLimitsText, ageNoticeText, participantRangeText } = await import('./ageRangeText');

const none = { participantMinAge: null, participantMaxAge: null, supervisorMinAge: null };

describe('participantRangeText', () => {
	it('names whichever ends the range has', () => {
		expect(participantRangeText({ participantMinAge: 15, participantMaxAge: 21 })).toBe('15-21');
		expect(participantRangeText({ participantMinAge: 15, participantMaxAge: null })).toBe('15+');
		expect(participantRangeText({ participantMinAge: null, participantMaxAge: 21 })).toBe('-21');
		expect(participantRangeText(none)).toBeUndefined();
	});
});

describe('ageLimitsText', () => {
	it('lists the limits there are', () => {
		expect(
			ageLimitsText({ participantMinAge: 15, participantMaxAge: 21, supervisorMinAge: 21 })
		).toBe('participants 15-21, supervisors 21+');
		expect(ageLimitsText({ ...none, supervisorMinAge: 18 })).toBe('supervisors 18+');
		expect(ageLimitsText(none)).toBeUndefined();
	});
});

describe('ageNoticeText', () => {
	it('words a supervisor below the limit', () => {
		expect(
			ageNoticeText({ ...none, supervisorMinAge: 21, issue: 'shouldNotBeSupervisor', age: 19 })
		).toBe('supervisor 21, is 19');
		expect(ageNoticeText({ ...none, issue: 'shouldNotBeSupervisor', age: 19 })).toBeUndefined();
	});

	it('words a participant outside the range', () => {
		expect(
			ageNoticeText({
				...none,
				participantMinAge: 15,
				participantMaxAge: 21,
				issue: 'tooOld',
				age: 22
			})
		).toBe('participant 15-21, is 22');
		expect(ageNoticeText({ ...none, issue: 'tooYoung', age: 12 })).toBeUndefined();
	});
});
