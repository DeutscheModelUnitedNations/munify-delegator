import { describe, expect, test, vi } from 'vitest';
import { plainAccessToken } from './plainAccessToken';

describe('plainAccessToken', () => {
	test('without a resource, the session token is already the plain one', async () => {
		const refreshWithoutResource = vi.fn();
		const storeRefreshToken = vi.fn();
		await expect(
			plainAccessToken({
				tokens: { accessToken: 'opaque', refreshToken: 'refresh' },
				resourceConfigured: false,
				refreshWithoutResource,
				storeRefreshToken
			})
		).resolves.toBe('opaque');
		expect(refreshWithoutResource).not.toHaveBeenCalled();
		expect(storeRefreshToken).not.toHaveBeenCalled();
	});

	test('with a resource, the refresh token is traded for a plain one', async () => {
		const refreshWithoutResource = vi.fn(async () => ({ access_token: 'plain' }));
		const storeRefreshToken = vi.fn();
		await expect(
			plainAccessToken({
				tokens: { accessToken: 'resource.jwt', refreshToken: 'refresh' },
				resourceConfigured: true,
				refreshWithoutResource,
				storeRefreshToken
			})
		).resolves.toBe('plain');
		expect(refreshWithoutResource).toHaveBeenCalledWith('refresh');
		// Nothing rotated: the session keeps its refresh token
		expect(storeRefreshToken).not.toHaveBeenCalled();
	});

	test('a rotated refresh token is stored, an unchanged one is not', async () => {
		const storeRefreshToken = vi.fn();
		await plainAccessToken({
			tokens: { accessToken: 'resource.jwt', refreshToken: 'refresh' },
			resourceConfigured: true,
			refreshWithoutResource: async () => ({ access_token: 'plain', refresh_token: 'rotated' }),
			storeRefreshToken
		});
		expect(storeRefreshToken).toHaveBeenCalledWith('rotated');

		storeRefreshToken.mockClear();
		await plainAccessToken({
			tokens: { accessToken: 'resource.jwt', refreshToken: 'refresh' },
			resourceConfigured: true,
			refreshWithoutResource: async () => ({ access_token: 'plain', refresh_token: 'refresh' }),
			storeRefreshToken
		});
		expect(storeRefreshToken).not.toHaveBeenCalled();
	});

	test('fails clearly when the session cannot provide one', async () => {
		await expect(
			plainAccessToken({
				tokens: { accessToken: 'resource.jwt' },
				resourceConfigured: true,
				refreshWithoutResource: vi.fn(),
				storeRefreshToken: vi.fn()
			})
		).rejects.toThrow(/offline_access/);
		await expect(
			plainAccessToken({
				tokens: {},
				resourceConfigured: false,
				refreshWithoutResource: vi.fn(),
				storeRefreshToken: vi.fn()
			})
		).rejects.toThrow(/no access token/);
	});
});
