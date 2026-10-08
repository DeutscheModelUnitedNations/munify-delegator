import { describe, expect, test } from 'vitest';
import { isValidPhoneNumber } from 'libphonenumber-js';
import { findDuplicates } from '../../services/duplicateMatching';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import {
	accountId,
	duplicateScenarios,
	profileOf,
	scenarioPairs,
	scenarioUsers,
	type Scenario
} from './duplicateScenarios';

/** What the matcher finds among one scenario's accounts, in the scenario's own terms. */
function found(scenario: Scenario) {
	const profiles = scenario.accounts.map((account) =>
		profileOf(accountId(scenario, account), account)
	);
	const names = new Map<string, string>(
		scenario.accounts.map((a) => [accountId(scenario, a), a.name])
	);
	return findDuplicates(profiles, profiles)
		.map((pair) => ({
			pair: [names.get(pair.userId), names.get(pair.candidateId)].sort().join('|'),
			reasons: pair.reasons
		}))
		.sort((a, b) => a.pair.localeCompare(b.pair));
}

describe('the duplicate scenarios', () => {
	for (const scenario of duplicateScenarios) {
		test(`${scenario.key}: the matcher finds exactly what the scenario says`, () => {
			const expected = scenario.expect
				.filter((pair) => !pair.stale)
				.map((pair) => ({ pair: [pair.a, pair.b].sort().join('|'), reasons: pair.reasons }))
				.sort((a, b) => a.pair.localeCompare(b.pair));
			expect(found(scenario)).toEqual(expected);
		});
	}

	test('no scenario pairs with another one, nor with a dev account', () => {
		const accounts = duplicateScenarios.flatMap((scenario) =>
			scenario.accounts.map((account) => profileOf(accountId(scenario, account), account))
		);
		const expected = scenarioPairs().map((row) => `${row.userId}|${row.candidateId}`);
		const all = findDuplicates(accounts, accounts).map((p) => `${p.userId}|${p.candidateId}`);
		// every pair found anywhere belongs to a scenario (stale ones are stored, not found)
		for (const pair of all) expect(expected).toContain(pair);
	});

	test('scenario and account keys are unique', () => {
		expect(new Set(duplicateScenarios.map((s) => s.key)).size).toBe(duplicateScenarios.length);
		for (const scenario of duplicateScenarios) {
			expect(new Set(scenario.accounts.map((a) => a.name)).size).toBe(scenario.accounts.length);
		}
	});

	test('every stored pair names accounts of its scenario and carries a decision only when decided', () => {
		const ids = new Set<string>(
			duplicateScenarios.flatMap((s) => s.accounts.map((a) => accountId(s, a)))
		);
		for (const row of scenarioPairs()) {
			expect(ids.has(row.userId)).toBe(true);
			expect(ids.has(row.candidateId)).toBe(true);
			expect(row.userId < row.candidateId).toBe(true);
			expect(Boolean(row.decidedAt)).toBe(row.status !== 'OPEN');
		}
	});

	test('the scenarios cover every decision state and every way a pair comes to be', () => {
		const states = new Set(scenarioPairs().map((row) => row.status));
		expect([...states].sort()).toEqual(['CONFIRMED', 'DISMISSED', 'OPEN']);

		const reasons = new Set(scenarioPairs().flatMap((row) => row.reasons));
		expect([...reasons].sort()).toEqual(
			['address', 'birthday', 'email', 'emergencyContact', 'name', 'phone'].sort()
		);
	});
});

describe('the scenario accounts', () => {
	test('have valid phone numbers and complete profiles, like real accounts', () => {
		for (const user of scenarioUsers()) {
			expect(isValidPhoneNumber(user.phone ?? ''), `${user.id} ${user.phone}`).toBe(true);
			const result = userFormSchema.safeParse({
				...user,
				given_name: user.givenName,
				family_name: user.familyName
			});
			expect(result.error?.issues, user.id).toBeUndefined();
		}
	});

	test('carry a care note only where the scenario gives one', () => {
		const notes = scenarioUsers().filter((user) => user.globalNotes);
		expect(notes.length).toBeGreaterThan(5);
		expect(scenarioUsers().some((user) => !user.globalNotes)).toBe(true);
	});
});
