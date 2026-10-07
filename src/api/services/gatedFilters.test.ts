import { buildSchema, parse } from 'graphql';
import { describe, expect, it } from 'vitest';
import { findGatedFilters, isGatedFilter } from './gatedFilters';

const schema = buildSchema(`
	input StringFilter { eq: String }
	input NationWhereInputArgument { alpha3Code: StringFilter, assignedDelegations: DelegationWhereInputArgument }
	input DelegationWhereInputArgument {
		id: StringFilter
		assignedNationAlpha3Code: StringFilter
		assignedNation: NationWhereInputArgument
		AND: [DelegationWhereInputArgument!]
	}
	input DelegationOrderInputArgument { id: String, assignedNationAlpha3Code: String }
	type Delegation { id: ID! }
	type Query {
		delegations(where: DelegationWhereInputArgument, orderBy: DelegationOrderInputArgument): [Delegation!]!
	}
`);

const find = (query: string, variables?: Record<string, unknown>) =>
	findGatedFilters(schema, parse(query), variables);

describe('findGatedFilters', () => {
	it('lets ordinary filters through', () => {
		expect(find(`{ delegations(where: { id: { eq: "x" } }) { id } }`)).toEqual([]);
	});

	it('finds a gated column and relation in a literal', () => {
		expect(
			find(`{ delegations(where: { assignedNationAlpha3Code: { eq: "FRA" } }) { id } }`)
		).toEqual(['DelegationWhereInputArgument.assignedNationAlpha3Code']);
		expect(
			find(`{ delegations(where: { assignedNation: { alpha3Code: { eq: "FRA" } } }) { id } }`)
		).toEqual(['DelegationWhereInputArgument.assignedNation']);
	});

	it('finds an ordering and a filter nested in AND and in a back relation', () => {
		expect(find(`{ delegations(orderBy: { assignedNationAlpha3Code: "asc" }) { id } }`)).toEqual([
			'DelegationOrderInputArgument.assignedNationAlpha3Code'
		]);
		expect(
			find(`{ delegations(where: { AND: [{ assignedNationAlpha3Code: { eq: "A" } }] }) { id } }`)
		).toEqual(['DelegationWhereInputArgument.assignedNationAlpha3Code']);
		expect(
			find(`query ($w: DelegationWhereInputArgument) { delegations(where: $w) { id } }`, {
				w: { assignedNation: { assignedDelegations: { id: { eq: 'x' } } } }
			}).sort()
		).toEqual([
			'DelegationWhereInputArgument.assignedNation',
			'NationWhereInputArgument.assignedDelegations'
		]);
	});

	it('finds one passed as a variable, which is how the client sends them', () => {
		const query = `query ($w: DelegationWhereInputArgument) { delegations(where: $w) { id } }`;
		expect(find(query, { w: { assignedNationAlpha3Code: { eq: 'FRA' } } })).toEqual([
			'DelegationWhereInputArgument.assignedNationAlpha3Code'
		]);
		expect(find(query, { w: { id: { eq: 'x' } } })).toEqual([]);
		expect(find(query, {})).toEqual([]);
	});
});

describe('isGatedFilter', () => {
	it('knows the gated fields of every table', () => {
		expect(isGatedFilter('CommitteeWhereInputArgument', 'delegationMembers')).toBe(true);
		expect(isGatedFilter('SingleparticipantOrderInputArgument', 'assignedRoleId')).toBe(true);
		expect(isGatedFilter('CommitteeWhereInputArgument', 'name')).toBe(false);
		expect(isGatedFilter('UserWhereInputArgument', 'assignedRoleId')).toBe(false);
	});
});
