import { describe, expect, it, vi } from 'vitest';

const { goto, mutate } = vi.hoisted(() => ({
	goto: vi.fn(),
	mutate: { startImpersonation: vi.fn(async () => true) }
}));
vi.mock('$app/navigation', () => ({ goto }));
vi.mock('$app/paths', () => ({ resolve: (path: string) => `/${path}` }));
vi.mock('#lib/api/rumbleClient/client', () => ({ client: { mutate } }));
vi.mock('svelte-sonner', () => ({ toast: { promise: vi.fn(), error: vi.fn() } }));

import { loadDashboardAfresh, startImpersonation } from './startImpersonation';

describe('loadDashboardAfresh', () => {
	it('loads the dashboard as a new page', () => {
		const location = { assign: vi.fn() };
		loadDashboardAfresh(location);
		expect(location.assign).toHaveBeenCalledWith('/dashboard');
	});
});

describe('startImpersonation', () => {
	it('never navigates client-side, where the open page would query again as the target', async () => {
		await startImpersonation('target');
		expect(mutate.startImpersonation).toHaveBeenCalledWith({ __args: { targetUserId: 'target' } });
		expect(goto).not.toHaveBeenCalled();
	});
});
