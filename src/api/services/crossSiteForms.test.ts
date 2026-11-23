// @vitest-environment node
import { describe, expect, test, vi } from 'vitest';
import { crossSiteFormHandle, isCrossSiteForm } from './crossSiteForms';

vi.mock('$app/env', () => ({ dev: false }));

const ORIGIN = 'https://delegator.example';

const request = ({
	method = 'POST',
	type,
	origin
}: {
	method?: string;
	type?: string;
	origin?: string;
}) =>
	new Request(`${ORIGIN}/x`, {
		method,
		headers: { ...(type ? { 'content-type': type } : {}), ...(origin ? { origin } : {}) }
	});

describe('isCrossSiteForm', () => {
	const of = (args: Parameters<typeof request>[0]) =>
		isCrossSiteForm({ request: request(args), origin: ORIGIN });

	test.each([
		undefined,
		'text/plain',
		'Multipart/Form-Data; boundary=x',
		'application/x-www-form-urlencoded',
		'application/x-sveltekit-formdata'
	])('is a write of type %s from another site, or from nowhere', (type) => {
		for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
			expect(of({ method, type, origin: 'https://evil.example' })).toBe(true);
			expect(of({ method, type })).toBe(true);
			expect(of({ method, type, origin: ORIGIN })).toBe(false);
		}
	});

	test('is nothing a preflight asks about first, and no read', () => {
		expect(of({ type: 'application/json', origin: 'https://evil.example' })).toBe(false);
		expect(of({ method: 'GET', origin: 'https://evil.example' })).toBe(false);
	});
});

describe('crossSiteFormHandle', () => {
	const handle = async (routeId: string) => {
		const resolve = vi.fn(async () => new Response('ok'));
		const response = await crossSiteFormHandle({
			// TYPE-SAFETY-EXCEPTION: only what the handle reads of an event
			event: {
				request: request({ method: 'PUT' }),
				url: new URL(`${ORIGIN}/x`),
				route: { id: routeId }
			} as unknown as Parameters<typeof crossSiteFormHandle>[0]['event'],
			resolve
		});
		return { status: response.status, resolved: resolve.mock.calls.length === 1 };
	};

	test('refuses them on every route but the one scanners upload to', async () => {
		expect(await handle('/api/graphql')).toEqual({ status: 403, resolved: false });
		expect(await handle('/api/scans/[...path]')).toEqual({ status: 200, resolved: true });
	});
});
