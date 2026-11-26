import { describe, expect, it, vi } from 'vitest';
import { createBuchhaltungsButlerClient } from './buchhaltungsbutlerClient';

const config = {
	baseUrl: 'https://bb.example/api/v1/',
	apiClient: 'client',
	apiSecret: 'secret',
	apiKey: 'customer-key'
};

function respond({ status = 200, body }: { status?: number; body: unknown }) {
	return vi.fn<typeof fetch>(() => Promise.resolve(new Response(JSON.stringify(body), { status })));
}

describe('transactions', () => {
	it('posts the filters with the customer key, authenticated as the API client', async () => {
		const fetchFn = respond({ body: { success: true, message: '', rows: 0, data: [] } });
		const client = createBuchhaltungsButlerClient({ config, fetchFn });
		await client.transactions({ dateFrom: '2026-09-27', afterId: 812, offset: 500 });

		const [url, init] = fetchFn.mock.calls[0];
		expect(url).toBe('https://bb.example/api/v1/transactions/get');
		expect(init?.method).toBe('POST');
		expect(new Headers(init?.headers).get('authorization')).toBe(
			`Basic ${Buffer.from('client:secret').toString('base64')}`
		);
		expect(JSON.parse(String(init?.body))).toEqual({
			api_key: 'customer-key',
			date_from: '2026-09-27',
			id_by_customer_from: 812,
			limit: 500,
			offset: 500
		});
	});

	it('sends the cursor 0 without one, so the answer is in id order from the start', async () => {
		const fetchFn = respond({ body: { success: true, rows: 0, data: [] } });
		await createBuchhaltungsButlerClient({ config, fetchFn }).transactions({
			dateFrom: '2026-09-27'
		});
		expect(JSON.parse(String(fetchFn.mock.calls[0][1]?.body))).toMatchObject({
			id_by_customer_from: 0
		});
	});

	it('reads ids and amounts the API sends as strings', async () => {
		const fetchFn = respond({
			body: {
				success: true,
				rows: 1,
				data: [
					{
						id_by_customer: '123',
						to_from: 'Name of payer',
						amount: '123.99',
						booking_date: '2026-11-20 00:00:00',
						value_date: '2026-11-20 00:00:00',
						purpose: 'ACDE-FHJK-MNPR-TUVW'
					}
				]
			}
		});
		const [transaction] = await createBuchhaltungsButlerClient({ config, fetchFn }).transactions({
			dateFrom: '2026-09-27'
		});
		expect(transaction).toEqual({
			id_by_customer: 123,
			to_from: 'Name of payer',
			amount: 123.99,
			booking_date: '2026-11-20 00:00:00',
			purpose: 'ACDE-FHJK-MNPR-TUVW'
		});
	});

	it('throws with the API error, so the run fails visibly', async () => {
		const fetchFn = respond({
			status: 401,
			body: { success: false, message: 'Invalid API credentials', error_code: 3 }
		});
		await expect(
			createBuchhaltungsButlerClient({ config, fetchFn }).transactions({ dateFrom: '2026-09-27' })
		).rejects.toThrow(
			'BuchhaltungsButler /transactions/get answered 401 Invalid API credentials (code 3)'
		);
	});

	it('throws on an unexpected answer', async () => {
		const fetchFn = respond({ body: { hello: 'world' } });
		await expect(
			createBuchhaltungsButlerClient({ config, fetchFn }).transactions({ dateFrom: '2026-09-27' })
		).rejects.toThrow();
	});
});
