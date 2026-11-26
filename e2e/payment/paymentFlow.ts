import { expect, type Page } from '../support/test';
import { waitForHydration } from '../support/auth';

const NEXT = /^(weiter|next)$/i;

/**
 * Opens the payment page and goes through its first steps: what it is about, and - where the
 * caller may pay for others - whom it covers. The payment guide counts as watched before, so its
 * step is done (a fresh account would have to watch every step for its time).
 */
export async function openPaymentFlow(
	page: Page,
	{ conferenceId, payForOthers }: { conferenceId: string; payForOthers?: boolean }
) {
	const watched = await page.request.post('/api/graphql', {
		data: { query: 'mutation { completePaymentGuide { id } }' }
	});
	expect((await watched.json()).errors).toBeUndefined();

	await discardOpenPayments(page, conferenceId);

	await page.goto(`/dashboard/${conferenceId}/payment`);
	await waitForHydration(page);
	// A retry finds the information read already (it is kept)
	const info = page.getByText(/sieh dir die hinweise bis zum ende an|watch the hints to the end/i);
	const infoOpen = await info
		.waitFor({ timeout: 10_000 })
		.then(() => true)
		.catch(() => false);
	if (infoOpen) {
		await page.getByRole('button', { name: NEXT }).click();
	}
	if (payForOthers !== undefined) {
		if (payForOthers) await page.getByLabel(/für andere mitbezahlen|pay for others too/i).check();
		await page.getByRole('button', { name: NEXT }).click();
	}
}

/**
 * Makes the reference and answers the reference the transfer step shows. The guide was watched
 * before (`openPaymentFlow`), so its step counts as done, like the postal guide's, and the transfer
 * step opens right away.
 */
export async function createReference(page: Page) {
	const generateButton = page.locator('button:has(.ph-sparkle)');
	await expect(generateButton).toBeEnabled({ timeout: 15_000 });
	await generateButton.click();
	return transferInputs(page);
}

/** The transfer step's fields: the reference first, then the amount and the account. */
export async function transferInputs(page: Page) {
	const inputs = page.locator('input[readonly]');
	await expect(inputs.first()).toHaveValue(/.+/, { timeout: 15_000 });
	return {
		reference: await inputs.nth(0).inputValue(),
		amount: parseFloat(await inputs.nth(1).inputValue())
	};
}

/**
 * Gives up the references the caller made in the conference that are still open, so a retry
 * starts with none (a payment covering the caller but made by somebody else is refused, NOT_FOUND).
 */
async function discardOpenPayments(page: Page, conferenceId: string) {
	const open = await page.request.post('/api/graphql', {
		data: {
			query: `query ($c: ID!) { paymentTransactions(where: { conference: { id: { eq: $c } }, recievedAt: { isNull: true }, discardedAt: { isNull: true } }) { id } }`,
			variables: { c: conferenceId }
		}
	});
	const payments: { id: string }[] = (await open.json())?.data?.paymentTransactions ?? [];
	for (const { id } of payments) {
		await page.request.post('/api/graphql', {
			data: {
				query: `mutation ($id: ID!) { discardPaymentTransaction(id: $id) { id } }`,
				variables: { id }
			}
		});
	}
}
