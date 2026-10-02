import { faker } from '@faker-js/faker';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { assignSeedRole, makeSeedDelegation } from './delegation';

describe('assignSeedRole', () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const seeded = () => makeSeedDelegation({ conferenceId: 'c1' });

	test('assigns the nation on heads', () => {
		vi.spyOn(faker.datatype, 'boolean').mockReturnValue(true);
		const delegation = seeded();
		assignSeedRole(delegation, { alpha3Code: 'DEU' }, { id: 'nsa' });
		expect(delegation.assignedNationAlpha3Code).toBe('DEU');
		expect(delegation.assignedNonStateActorId).toBeNull();
	});

	test('assigns the non-state actor on tails', () => {
		vi.spyOn(faker.datatype, 'boolean').mockReturnValue(false);
		const delegation = seeded();
		assignSeedRole(delegation, { alpha3Code: 'DEU' }, { id: 'nsa' });
		expect(delegation.assignedNationAlpha3Code).toBeNull();
		expect(delegation.assignedNonStateActorId).toBe('nsa');
	});

	test('leaves the delegation without a role once the pool is used up', () => {
		const delegation = seeded();
		vi.spyOn(faker.datatype, 'boolean').mockReturnValue(true);
		assignSeedRole(delegation, undefined, undefined);
		vi.spyOn(faker.datatype, 'boolean').mockReturnValue(false);
		assignSeedRole(delegation, undefined, {});
		expect(delegation.assignedNationAlpha3Code).toBeNull();
		expect(delegation.assignedNonStateActorId).toBeNull();
	});
});
