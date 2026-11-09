import { describe, expect, it } from 'vitest';
import { ageLimitSchema } from './ageLimit';

describe('ageLimitSchema', () => {
	it('takes whole years from 1 to 120, or nothing', () => {
		const schema = ageLimitSchema();
		expect(schema.safeParse(1).success).toBe(true);
		expect(schema.safeParse(120).success).toBe(true);
		expect(schema.safeParse(null).success).toBe(true);
		expect(schema.safeParse(undefined).success).toBe(true);
		expect(schema.safeParse(0).success).toBe(false);
		expect(schema.safeParse(121).success).toBe(false);
		expect(schema.safeParse(15.5).success).toBe(false);
	});
});
