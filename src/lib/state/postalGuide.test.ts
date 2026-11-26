import { beforeEach, describe, expect, test, vi } from 'vitest';

const user = vi.fn();
const impersonationStatus = vi.fn();
const recordOnAccount = vi.fn();

vi.mock('$app/env', () => ({ browser: true }));
vi.mock('#lib/api/rumbleClient/client', () => ({
	client: {
		query: { user, impersonationStatus },
		mutate: { completePostalGuide: recordOnAccount }
	}
}));
vi.mock('./currentUser.svelte.js', () => ({ getCurrentUser: async () => ({ sub: 'ada' }) }));

/** The module as after a page load, with nothing watched yet. */
async function load() {
	vi.resetModules();
	return import('./postalGuide.svelte.js');
}

type Guide = Awaited<ReturnType<typeof load>>['postalGuide'];

const opened = (guide: Guide) => vi.waitUntil(() => guide.current);

beforeEach(() => {
	vi.resetAllMocks();
	user.mockResolvedValue({ postalGuideCompletedAt: null });
	impersonationStatus.mockResolvedValue({ isImpersonating: false });
	recordOnAccount.mockResolvedValue({});
});

describe('fetchPostalGuideStatus', () => {
	test('the first time it has to be watched, which is recorded', async () => {
		const { fetchPostalGuideStatus } = await load();
		expect(await fetchPostalGuideStatus()).toEqual({ skippable: false, recorded: true });
	});

	test('may be skipped by who watched it before', async () => {
		user.mockResolvedValue({ postalGuideCompletedAt: new Date() });
		const { fetchPostalGuideStatus } = await load();
		expect(await fetchPostalGuideStatus()).toEqual({ skippable: true, recorded: false });
	});

	test('who impersonates may skip it, and watches it for nobody', async () => {
		impersonationStatus.mockResolvedValue({ isImpersonating: true });
		const { fetchPostalGuideStatus } = await load();
		expect(await fetchPostalGuideStatus()).toEqual({ skippable: true, recorded: false });
	});
});

describe('completePostalGuide', () => {
	test('records it only where it is to be kept', async () => {
		const { completePostalGuide } = await load();
		await completePostalGuide({ skippable: true, recorded: false });
		expect(recordOnAccount).not.toHaveBeenCalled();
		await completePostalGuide({ skippable: false, recorded: true });
		expect(recordOnAccount).toHaveBeenCalledOnce();
	});

	test('failing keeps nobody from going on', async () => {
		recordOnAccount.mockRejectedValue(new Error('offline'));
		const { completePostalGuide } = await load();
		await expect(
			completePostalGuide({ skippable: false, recorded: true })
		).resolves.toBeUndefined();
	});
});

describe('passPostalGuide', () => {
	test('the download goes on after the guide', async () => {
		const { passPostalGuide, postalGuide } = await load();
		const passed = passPostalGuide();
		expect(await opened(postalGuide)).toMatchObject({ skippable: false });
		postalGuide.close(true);
		expect(await passed).toBe(true);
		expect(postalGuide.current).toBeUndefined();
	});

	test('closed before its end there is no download, and the next one shows it again', async () => {
		const { passPostalGuide, postalGuide } = await load();
		const passed = passPostalGuide();
		await opened(postalGuide);
		postalGuide.close(false);
		expect(await passed).toBe(false);

		void passPostalGuide();
		expect(await opened(postalGuide)).toMatchObject({ skippable: false });
	});

	test('passed once, it does not ask again until the page is reloaded', async () => {
		const { passPostalGuide, postalGuide } = await load();
		const passed = passPostalGuide();
		await opened(postalGuide);
		postalGuide.close(true);
		await passed;
		expect(await passPostalGuide()).toBe(true);
		expect(postalGuide.current).toBeUndefined();
	});

	test('does not ask after it was watched as a step of the page', async () => {
		const { markPostalGuidePassed, passPostalGuide, postalGuide } = await load();
		markPostalGuidePassed();
		expect(await passPostalGuide()).toBe(true);
		expect(postalGuide.current).toBeUndefined();
	});
});
