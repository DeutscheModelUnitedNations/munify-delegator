import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { jsonDocument } from './argSchemas';

const schema = jsonDocument({
	schema: z.object({ name: z.string() }),
	malformed: () => 'malformed',
	invalid: (details) => `invalid: ${details}`
});

const messages = (value: unknown) =>
	schema.safeParse(value).error?.issues.map((issue) => issue.message) ?? [];

describe('jsonDocument', () => {
	it('takes the document as a JSON string or already parsed', () => {
		expect(schema.parse('{"name":"a"}')).toEqual({ name: 'a' });
		expect(schema.parse({ name: 'a' })).toEqual({ name: 'a' });
	});

	it('refuses text that is not JSON', () => {
		expect(messages('{nope')).toEqual(['malformed']);
	});

	it('refuses a document that does not fit, with one issue naming the details', () => {
		const [message, ...rest] = messages({ name: 1 });
		expect(rest).toEqual([]);
		expect(message).toMatch(/^invalid: .*name/s);
	});
});
