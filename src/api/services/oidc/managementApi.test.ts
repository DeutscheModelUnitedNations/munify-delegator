// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('$app/env/private', () => ({
	OIDC_M2M_CLIENT_ID: 'm2m',
	OIDC_M2M_CLIENT_SECRET: 'secret',
	OIDC_M2M_RESOURCE: undefined
}));
vi.mock('./OIDC', () => ({
	OIDC: {
		core: {
			configuration: {
				serverMetadata: () => ({
					issuer: 'https://id.example/oidc',
					token_endpoint: 'https://id.example/oidc/token'
				})
			}
		}
	}
}));

const answer = vi.fn<() => Response>();

beforeEach(() => {
	vi.resetModules();
	answer.mockReset();
	vi.stubGlobal('fetch', async (url: string) =>
		url.endsWith('/token') ? Response.json({ access_token: 't' }) : answer()
	);
});
afterEach(() => vi.unstubAllGlobals());

const isActive = async () => (await import('./managementApi')).isAccountActive('ada');

describe('isAccountActive', () => {
	test('is false for a suspended account and one that is gone', async () => {
		answer.mockReturnValue(Response.json({ id: 'ada', isSuspended: true }));
		expect(await isActive()).toBe(false);
		vi.resetModules();
		answer.mockReturnValue(Response.json({ code: 'entity.not_found' }, { status: 404 }));
		expect(await isActive()).toBe(false);
	});

	test('is true for any other, asked once in a while only', async () => {
		answer.mockReturnValue(Response.json({ id: 'ada', isSuspended: false }));
		expect(await isActive()).toBe(true);
		expect(await isActive()).toBe(true);
		expect(answer).toHaveBeenCalledOnce();
	});

	test('is true while the provider cannot be asked', async () => {
		answer.mockReturnValue(new Response('no such route', { status: 404 }));
		expect(await isActive()).toBe(true);
		answer.mockImplementation(() => {
			throw new Error('down');
		});
		expect(await isActive()).toBe(true);
	});
});
