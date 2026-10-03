import { test, expect } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser, waitForHydration } from '../support/auth';
import { E2E_CONFERENCE_ID, E2E_PAYMENT_ADMIN_ID, E2E_ROLE_ID } from '../seed/seed';

test('a participant can generate a payment reference and an admin can mark it received', async ({
	browser
}) => {
	const participantContext = await browser.newContext();
	const participantPage = await participantContext.newPage();

	const participant = makeTestUser('payment-participant');
	await loginAs(participantPage, participant, { startUrl: '/dashboard' });

	// Only somebody taking part in the conference can be paid for, so the participant registers
	// first - the API refuses a payment reference for anybody else.
	const registered = await participantPage.request.post('/api/graphql', {
		data: {
			query: `mutation ($c: ID!, $r: ID!) { createSingleParticipant(conferenceId: $c, roleId: $r) { id } }`,
			variables: { c: E2E_CONFERENCE_ID, r: E2E_ROLE_ID }
		}
	});
	expect((await registered.json()).errors).toBeUndefined();

	await participantPage.goto(`/dashboard/${E2E_CONFERENCE_ID}/payment/single`);
	await waitForHydration(participantPage);

	const generateButton = participantPage.locator('button:has(.fa-sparkles)');
	await expect(generateButton).toBeVisible({ timeout: 15_000 });
	await generateButton.click();

	const reasonInput = participantPage.locator('input[readonly]').last();
	await expect(reasonInput).toHaveValue(/.+/, { timeout: 15_000 });
	const reference = await reasonInput.inputValue();
	expect(reference).toBeTruthy();

	await participantContext.close();

	const adminContext = await browser.newContext();
	const adminPage = await adminContext.newPage();

	await loginAs(adminPage, fixedTestUser(E2E_PAYMENT_ADMIN_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/management/payments`
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

	await adminContext.close();
});
