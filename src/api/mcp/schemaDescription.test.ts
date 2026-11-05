import { describe, expect, it } from 'vitest';
import { buildClientSchema } from 'graphql';
import { schema as introspection } from '#lib/api/rumbleClient/schema';
import { describeSchema } from './schemaDescription';

const schema = buildClientSchema(introspection);

describe('describeSchema', () => {
	it('lists the root queries without a type', () => {
		const description = describeSchema({ schema, typeName: undefined });
		expect('queries' in description && description.queries).toContainEqual(
			expect.stringMatching(
				/^delegations\(.*where: DelegationWhereInputArgument.*\): \[Delegation!\]!$/
			)
		);
	});

	it('marks what an assistant reads redacted, and counts it reads as <5', () => {
		const user = describeSchema({ schema, typeName: 'User' });
		const fields = 'fields' in user ? user.fields : [];
		expect(fields).toContain('familyName: String!  # [redacted]');
		expect(fields).toContain('city: String');

		const gender = describeSchema({
			schema,
			typeName: 'StatisticsResultRegisteredParticipantGenderVariations'
		});
		expect('fields' in gender && gender.fields).toContain('male: Int!  # counts of 1-4 read <5');
	});

	it('describes input types and enums, and says when there is no such type', () => {
		expect(describeSchema({ schema, typeName: 'AssignmentSplitPartInput' })).toEqual({
			input: 'AssignmentSplitPartInput',
			fields: ['memberIds: [ID!]!']
		});
		expect(describeSchema({ schema, typeName: 'AdministrativestatusEnum' })).toEqual({
			enum: 'AdministrativestatusEnum',
			values: ['DONE', 'PENDING', 'PROBLEM']
		});
		expect(describeSchema({ schema, typeName: 'Nope' })).toEqual({
			error: 'There is no type called Nope.'
		});
	});
});
