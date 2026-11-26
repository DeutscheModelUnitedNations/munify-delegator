import { z } from 'zod';

/**
 * The few calls of BuchhaltungsButler's REST API (v1) the bank payment sync makes. Every call is a
 * POST with a JSON body carrying the customer's `api_key`, authenticated with the API client and
 * secret (HTTP Basic). Spec: https://app.buchhaltungsbutler.de/docs/api/v1.de.json
 */

export interface BuchhaltungsButlerConfig {
	/** e.g. `https://webapp.buchhaltungsbutler.de/api/v1` */
	baseUrl: string;
	apiClient: string;
	apiSecret: string;
	/** The customer (company) whose bank accounts are read. */
	apiKey: string;
}

/** The most `transactions/get` returns per call. */
export const MAX_PAGE_SIZE = 500;

const transactionSchema = z.object({
	id_by_customer: z.coerce.number().int(),
	to_from: z.string().nullish(),
	/** Positive for money coming in. */
	amount: z.coerce.number(),
	/** `YYYY-MM-DD HH:MM:SS` */
	booking_date: z.string(),
	purpose: z.string().nullish()
});

export type BankTransaction = z.output<typeof transactionSchema>;

const transactionsSchema = z.object({
	success: z.literal(true),
	rows: z.coerce.number().int(),
	data: z.array(transactionSchema)
});

const failureSchema = z.object({
	success: z.literal(false),
	message: z.string().optional(),
	error_code: z.coerce.number().optional()
});

export function createBuchhaltungsButlerClient({
	config,
	fetchFn = fetch
}: {
	config: BuchhaltungsButlerConfig;
	fetchFn?: typeof fetch;
}) {
	const authorization = `Basic ${Buffer.from(`${config.apiClient}:${config.apiSecret}`).toString('base64')}`;

	async function call(path: string, body: Record<string, unknown>): Promise<unknown> {
		const response = await fetchFn(`${config.baseUrl.replace(/\/$/, '')}${path}`, {
			method: 'POST',
			headers: { authorization, 'content-type': 'application/json', accept: 'application/json' },
			body: JSON.stringify({ api_key: config.apiKey, ...body })
		});
		const json: unknown = await response.json().catch(() => undefined);
		const failure = failureSchema.safeParse(json);
		if (!response.ok || failure.success) {
			const detail = failure.success
				? `${failure.data.message ?? ''} (code ${failure.data.error_code ?? '?'})`
				: '';
			throw new Error(`BuchhaltungsButler ${path} answered ${response.status} ${detail}`.trim());
		}
		return json;
	}

	return {
		/**
		 * One page of the bank transactions booked on or after `dateFrom` (`YYYY-MM-DD`), of every
		 * account, and with `afterId` only those after that id, in id order.
		 */
		async transactions({
			dateFrom,
			afterId,
			offset = 0,
			limit = MAX_PAGE_SIZE
		}: {
			dateFrom: string;
			afterId?: number;
			offset?: number;
			limit?: number;
		}): Promise<BankTransaction[]> {
			const json = await call('/transactions/get', {
				date_from: dateFrom,
				...(afterId === undefined ? {} : { id_by_customer_from: afterId }),
				limit,
				offset
			});
			return transactionsSchema.parse(json).data;
		}
	};
}

export type BuchhaltungsButlerClient = ReturnType<typeof createBuchhaltungsButlerClient>;
