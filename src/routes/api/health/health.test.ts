import { describe, expect, it } from 'vitest';
import { GET } from './+server';

describe('GET /api/health', () => {
	it('answers 200 without looking at anything behind the server', async () => {
		const response = GET();
		expect(response.status).toBe(200);
		expect(await response.text()).toBe('ok');
	});
});
