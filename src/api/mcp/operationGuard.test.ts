import { describe, expect, it } from 'vitest';
import { buildClientSchema, parse } from 'graphql';
import { schema as introspection } from '#lib/api/rumbleClient/schema';
import { argumentProblems, singleQueryOperation } from './operationGuard';

const schema = buildClientSchema(introspection);

function problems(query: string, variables: Record<string, unknown> = {}) {
	const document = parse(query);
	const single = singleQueryOperation(document);
	if ('problem' in single) return [single.problem];
	return argumentProblems({ schema, document, operation: single.operation, variables });
}

describe('argumentProblems', () => {
	it('lets filters on visible fields through', () => {
		expect(
			problems(
				`{ delegations(where: { conferenceId: { eq: "c" }, applied: { eq: true } }) { id } }`
			)
		).toEqual([]);
		expect(
			problems(`{ users(where: { city: { eq: "Berlin" } }, orderBy: { createdAt: desc }) { id } }`)
		).toEqual([]);
	});

	it('refuses filtering by personal data, also nested and in variables', () => {
		expect(problems(`{ users(where: { familyName: { like: "M%" } }) { id } }`)).toHaveLength(1);
		expect(
			problems(`{ delegations(where: { members: { user: { email: { eq: "a@b.c" } } } }) { id } }`)
		).toHaveLength(1);
		expect(
			problems(
				`{ users(where: { OR: [{ city: { eq: "Bonn" } }, { givenName: { eq: "Ada" } }] }) { id } }`
			)
		).toHaveLength(1);
		expect(
			problems(`query ($w: UserWhereInputArgument) { users(where: $w) { id } }`, {
				w: { birthday: { gt: '2008-01-01' } }
			})
		).toHaveLength(1);
		expect(
			problems(
				`{ conference(id: "c") { delegations(where: { motivation: { like: "%x%" } }) { id } } }`
			)
		).toHaveLength(1);
	});

	it('refuses sorting by personal data', () => {
		expect(problems(`{ users(orderBy: { familyName: asc }) { id } }`)).toHaveLength(1);
	});

	it('refuses rumble search on tables holding personal text, allows it elsewhere', () => {
		expect(problems(`{ users(search: { term: "Ada" }) { id } }`)).toHaveLength(1);
		expect(problems(`{ committees(search: { term: "General" }) { id } }`)).toEqual([]);
	});

	it('refuses lookups by code, name or address', () => {
		expect(
			problems(`{ previewDelegation(conferenceId: "c", entryCode: "ABCDEFGH") { id } }`)
		).toHaveLength(1);
		expect(
			problems(`{ checkTeamInvitationEmails(conferenceId: "c", emails: ["a@b.c"]) { status } }`)
		).toHaveLength(1);
		expect(problems(`{ searchSchools(search: "Gymnasium") { id } }`)).toEqual([]);
	});

	it('runs only one query', () => {
		expect(problems(`mutation { deleteCommittee(id: "c") }`)).toHaveLength(1);
		expect(
			problems(`query A { committees { id } } query B { nations { alpha3Code } }`)
		).toHaveLength(1);
	});
});
