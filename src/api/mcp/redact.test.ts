import { describe, expect, it } from 'vitest';
import { buildClientSchema, parse, type OperationDefinitionNode } from 'graphql';
import { schema as introspection } from '#lib/api/rumbleClient/schema';
import { redactResult, type ResultValue } from './redact';

const schema = buildClientSchema(introspection);

function redact({ query, data }: { query: string; data: { [key: string]: ResultValue } }) {
	const document = parse(query);
	const operation = document.definitions.find(
		(definition): definition is OperationDefinitionNode => definition.kind === 'OperationDefinition'
	);
	if (!operation) throw new Error('no operation');
	return redactResult({ schema, document, operation, data });
}

describe('redactResult', () => {
	it('redacts personal leaves and keeps the rest', () => {
		const data = redact({
			query: '{ users { id givenName familyName city email birthday } }',
			data: {
				users: [
					{
						id: 'u1',
						givenName: 'Ada',
						familyName: 'Lovelace',
						city: 'London',
						email: 'ada@example.org',
						birthday: null
					}
				]
			}
		});
		expect(data).toEqual({
			users: [
				{
					id: 'u1',
					givenName: '[redacted]',
					familyName: '[redacted]',
					city: 'London',
					email: '[redacted]',
					birthday: null
				}
			]
		});
	});

	it('follows aliases, nesting and fragments', () => {
		const data = redact({
			query: `
				query { delegations { id motivation members { user { name: givenName ...Where } } } }
				fragment Where on User { country street }
			`,
			data: {
				delegations: [
					{
						id: 'd1',
						motivation: 'Because.',
						members: [{ user: { name: 'Grace', country: 'USA', street: 'Main St 1' } }]
					}
				]
			}
		});
		expect(data).toEqual({
			delegations: [
				{
					id: 'd1',
					motivation: '[redacted]',
					members: [{ user: { name: '[redacted]', country: 'USA', street: '[redacted]' } }]
				}
			]
		});
	});

	it('hides small groups in counts by a redacted attribute', () => {
		const data = redact({
			query: `{ getConferenceStatistics(conferenceId: "c") {
				gender { delegationMembers { male female diverse noStatement } }
			} }`,
			data: {
				getConferenceStatistics: {
					gender: {
						delegationMembers: { male: 12, female: 4, diverse: 1, noStatement: 0 }
					}
				}
			}
		});
		expect(data).toEqual({
			getConferenceStatistics: {
				gender: {
					delegationMembers: { male: 12, female: '<5', diverse: '<5', noStatement: 0 }
				}
			}
		});
	});

	it('shows the harmless plain answer of a mutation', () => {
		const data = redact({
			query: 'mutation { deleteCommittee(id: "c1") }',
			data: { deleteCommittee: true }
		});
		expect(data).toEqual({ deleteCommittee: true });
	});
});
