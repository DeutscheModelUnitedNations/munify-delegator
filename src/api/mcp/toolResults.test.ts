import { describe, expect, it, vi } from 'vitest';
import { buildClientSchema, GraphQLError } from 'graphql';
import { schema as introspection } from '#lib/api/rumbleClient/schema';
import { logger } from '#lib/logger';
import {
	answerOf,
	checkedQuery,
	dataOfResult,
	failureOf,
	MAX_ANSWER_LENGTH,
	McpRefusal,
	refusalOfErrors
} from './toolResults';

const schema = buildClientSchema(introspection);

describe('answerOf', () => {
	it('answers JSON as text', () => {
		expect(answerOf({ a: 1 })).toEqual({ content: [{ type: 'text', text: '{"a":1}' }] });
	});

	it('refuses an answer too large for an assistant', () => {
		expect(() => answerOf('x'.repeat(MAX_ANSWER_LENGTH + 1))).toThrow(McpRefusal);
	});
});

describe('failureOf', () => {
	it('passes a refusal on as it was worded', () => {
		expect(failureOf(new McpRefusal('No.'))).toEqual({ outcome: 'REFUSED', message: 'No.' });
	});

	it('tells nothing of an unexpected error, and logs it', () => {
		const log = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		expect(failureOf(new Error('SELECT … WHERE email = $1'))).toEqual({
			outcome: 'ERROR',
			message: 'Unexpected error.'
		});
		expect(log).toHaveBeenCalled();
		log.mockRestore();
	});
});

describe('refusalOfErrors', () => {
	it('words expected errors as they are', () => {
		const refusal = refusalOfErrors([
			new GraphQLError('Access denied', { path: ['createCommittee'] })
		]);
		expect(refusal).toMatchObject({
			outcome: 'REFUSED',
			message: 'createCommittee: Access denied'
		});
	});

	it('hides unexpected ones', () => {
		const log = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
		const refusal = refusalOfErrors([
			new GraphQLError('wrapped', { originalError: new Error('duplicate key (email)=(a@b.c)') })
		]);
		expect(refusal).toMatchObject({ outcome: 'ERROR', message: 'Unexpected error.' });
		log.mockRestore();
	});
});

describe('checkedQuery', () => {
	it('lets a valid read through', () => {
		const { operation } = checkedQuery({
			schema,
			query: '{ committees { id name } }',
			variables: {}
		});
		expect(operation.operation).toBe('query');
	});

	it.each([
		['what does not parse', '{ committees {'],
		['mutations', 'mutation { deleteCommittee(id: "c") }'],
		['what the schema does not have', '{ committees { shoeSize } }'],
		['filters by personal data', '{ users(where: { email: { eq: "a@b.c" } }) { id } }']
	])('refuses %s', (_case, query) => {
		expect(() => checkedQuery({ schema, query, variables: {} })).toThrow(McpRefusal);
	});
});

describe('dataOfResult', () => {
	it('answers the data, or none', () => {
		expect(dataOfResult({ data: { committees: [] } })).toEqual({ committees: [] });
		expect(dataOfResult({ data: null })).toEqual({});
	});

	it('refuses with the errors', () => {
		expect(() => dataOfResult({ data: null, errors: [new GraphQLError('Nope')] })).toThrow(
			McpRefusal
		);
	});
});
