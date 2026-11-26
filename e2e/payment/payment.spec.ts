import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_PAYMENT_ADMIN_ID, E2E_ROLE_ID } from '../seed/seed';
import { createReference, openPaymentFlow, transferInputs } from './paymentFlow';

test('a participant can generate a payment reference and an admin can mark it received', async ({
	browser
}) => {
	const participantContext = await browser.newContext();
	const participantPage = await participantContext.newPage();

	const participant = makeTestUser('payment-participant');
	await loginAs(participantPage, participant);

	// Only somebody taking part in the conference can be paid for, so the participant registers
	// first - the API refuses a payment reference for anybody else.
	const registered = await participantPage.request.post('/api/graphql', {
		data: {
			query: `mutation ($c: ID!, $r: ID!) { createSingleParticipant(conferenceId: $c, roleId: $r) { id } }`,
			variables: { c: E2E_CONFERENCE_ID, r: E2E_ROLE_ID }
		}
	});
	expect((await registered.json()).errors).toBeUndefined();

	// Nobody else to pay for: no step asks whom the payment covers
	await openPaymentFlow(participantPage, { conferenceId: E2E_CONFERENCE_ID });
	const { reference } = await createReference(participantPage);
	expect(reference).toBeTruthy();

	// Coming back, the page goes on where it was, with the same reference
	await participantPage.reload();
	await waitForHydration(participantPage);
	expect((await transferInputs(participantPage)).reference).toBe(reference);

	const adminContext = await browser.newContext();
	const adminPage = await adminContext.newPage();

	await loginAs(adminPage, fixedTestUser(E2E_PAYMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/payments`
	});

	await adminPage.getByPlaceholder(/referenzsuche|reference search/i).fill(reference);
	await adminPage.keyboard.press('Enter');

	const markReceivedButton = adminPage.getByRole('button', {
		name: /als erhalten markieren|mark as recieved/i
	});
	await expect(markReceivedButton).toBeVisible({ timeout: 15_000 });
	await markReceivedButton.click();

	// markReceivedAndNext() closes the drawer and clears the search field right after marking the
	// transaction as received, so the result cannot be confirmed in-place. Re-searching the
	// reference and matching on rendered text proved flaky (the row's status text is only present
	// while the re-opened drawer is settled), so assert the persisted state directly instead.
	await expect
		.poll(
			async () => {
				const res = await adminPage.request.post('/api/graphql', {
					data: {
						query: `query { paymentTransaction(id: "${reference}") { recievedAt } }`
					}
				});
				return (await res.json())?.data?.paymentTransaction?.recievedAt ?? null;
			},
			{ timeout: 15_000 }
		)
		.not.toBeNull();

	// Paid now: the API refuses the participant a further reference, and the payment page says so
	// instead of offering one
	const again = await participantPage.request.post('/api/graphql', {
		data: {
			query: `mutation ($c: ID!, $u: ID!) { createPaymentTransaction(conferenceId: $c, userId: $u, paymentFor: [$u]) { id } }`,
			variables: { c: E2E_CONFERENCE_ID, u: participant.preferred_username }
		}
	});
	expect((await again.json()).errors?.[0]?.extensions?.code).toBe('CONFLICT');

	await participantPage.reload();
	await waitForHydration(participantPage);
	await expect(participantPage.locator('button:has(.ph-sparkle)')).toHaveCount(0);
	await expect(participantPage.locator('.alert-success')).toBeVisible({ timeout: 15_000 });

	await participantContext.close();
	await adminContext.close();
});

test('a participant can say they transferred, take it back and start the payment over', async ({
	browser
}) => {
	const participantContext = await browser.newContext();
	const page = await participantContext.newPage();
	const participant = makeTestUser('payment-restart');
	await loginAs(page, participant);
	const registered = await page.request.post('/api/graphql', {
		data: {
			query: `mutation ($c: ID!, $r: ID!) { createSingleParticipant(conferenceId: $c, roleId: $r) { id } }`,
			variables: { c: E2E_CONFERENCE_ID, r: E2E_ROLE_ID }
		}
	});
	expect((await registered.json()).errors).toBeUndefined();

	await openPaymentFlow(page, { conferenceId: E2E_CONFERENCE_ID });
	const { reference } = await createReference(page);

	// Said transferred: the last step waits for the money
	await page.getByRole('button', { name: /ich habe überwiesen|i have transferred/i }).click();
	await expect(page.getByText(/bei uns eingegangen|received by us/i)).toBeVisible({
		timeout: 15_000
	});

	// Taken back: the transfer step is open again
	await page.getByRole('button', { name: /angabe zurücknehmen|take back/i }).click();
	await expect(
		page.getByRole('button', { name: /ich habe überwiesen|i have transferred/i })
	).toBeVisible({ timeout: 15_000 });
	// the last step folds away, its own way to start over with it
	await expect(page.getByText(/bei uns eingegangen|received by us/i)).toBeHidden();

	// Started over: the old reference is given up, and a new one is made
	await page.getByRole('button', { name: /zahlung neu beginnen|start the payment over/i }).click();
	await page.getByRole('button', { name: /referenz verwerfen|discard the reference/i }).click();
	const generateButton = page.locator('button:has(.ph-sparkle)');
	await expect(generateButton).toBeEnabled({ timeout: 15_000 });
	// the old reference's fields are gone before the new ones are read
	await expect(page.locator('input[readonly]')).toHaveCount(0);
	await generateButton.click();
	const { reference: renewed } = await transferInputs(page);
	expect(renewed).not.toBe(reference);

	// The old one is kept, marked given up, for participant care to match a late transfer
	const adminContext = await browser.newContext();
	const adminPage = await adminContext.newPage();
	await loginAs(adminPage, fixedTestUser(E2E_PAYMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/team/payments`
	});
	await adminPage.getByPlaceholder(/referenzsuche|reference search/i).fill(reference);
	await adminPage.keyboard.press('Enter');
	await expect(adminPage.getByText(/verworfen|discarded by the payer/i)).toBeVisible({
		timeout: 15_000
	});

	await participantContext.close();
	await adminContext.close();
});
