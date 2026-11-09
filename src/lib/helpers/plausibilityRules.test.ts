import { describe, expect, it } from 'vitest';
import {
	ageBands,
	ageIssue,
	DEFAULT_AGE_LIMITS,
	type AgeBand,
	type AgeIssue,
	type AgeLimits
} from './plausibilityRules';

const participant = (age: number, limits: AgeLimits = DEFAULT_AGE_LIMITS) =>
	ageIssue({ age, role: 'participant', limits });
const supervisor = (age: number, limits: AgeLimits = DEFAULT_AGE_LIMITS) =>
	ageIssue({ age, role: 'supervisor', limits });

describe('ageIssue', () => {
	it('takes participants from the lower to the upper limit, both included', () => {
		expect(participant(14)).toBe('tooYoung');
		expect(participant(15)).toBeUndefined();
		expect(participant(21)).toBeUndefined();
		expect(participant(22)).toBe('shouldBeSupervisor');
	});

	it('calls a participant past the range too old while they are too young to supervise', () => {
		const limits = { participantMinAge: 15, participantMaxAge: 19, supervisorMinAge: 21 };
		expect(participant(20, limits)).toBe('tooOld');
		expect(participant(21, limits)).toBe('shouldBeSupervisor');
	});

	it('takes supervisors from their limit on', () => {
		expect(supervisor(20)).toBe('shouldNotBeSupervisor');
		expect(supervisor(21)).toBeUndefined();
		expect(supervisor(70)).toBeUndefined();
	});

	it('checks nothing a switched off limit would', () => {
		const none = { participantMinAge: null, participantMaxAge: null, supervisorMinAge: null };
		expect(participant(5, none)).toBeUndefined();
		expect(participant(80, none)).toBeUndefined();
		expect(supervisor(16, none)).toBeUndefined();
		expect(participant(30, { ...DEFAULT_AGE_LIMITS, supervisorMinAge: null })).toBe(
			'shouldBeSupervisor'
		);
	});
});

describe('ageBands', () => {
	const inBand = (age: number, band: AgeBand | undefined) =>
		!!band &&
		(band.gte === undefined || age >= band.gte) &&
		(band.lt === undefined || age < band.lt);
	const limitSets: AgeLimits[] = [
		DEFAULT_AGE_LIMITS,
		{ participantMinAge: 13, participantMaxAge: 18, supervisorMinAge: 21 },
		{ participantMinAge: 16, participantMaxAge: 25, supervisorMinAge: 18 },
		{ participantMinAge: null, participantMaxAge: 20, supervisorMinAge: null },
		{ participantMinAge: 15, participantMaxAge: null, supervisorMinAge: 21 },
		{ participantMinAge: null, participantMaxAge: null, supervisorMinAge: null }
	];
	const participantIssues: AgeIssue[] = ['tooYoung', 'tooOld', 'shouldBeSupervisor'];

	it('puts every age into the band of the issue ageIssue finds, and no other', () => {
		for (const limits of limitSets) {
			const bands = ageBands(limits);
			for (let age = 0; age <= 90; age++) {
				const issue = ageIssue({ age, role: 'participant', limits });
				for (const candidate of participantIssues) {
					expect(inBand(age, bands[candidate]), `${candidate} at ${age}`).toBe(issue === candidate);
				}
				const supervisorIssue = ageIssue({ age, role: 'supervisor', limits });
				expect(inBand(age, bands.shouldNotBeSupervisor)).toBe(
					supervisorIssue === 'shouldNotBeSupervisor'
				);
			}
		}
	});
});
