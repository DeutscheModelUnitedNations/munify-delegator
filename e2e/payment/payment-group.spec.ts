import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { createReference, openPaymentFlow } from './paymentFlow';
import { E2E_CONFERENCE_ID, E2E_SUPERVISOR_FOR_CONNECT_USER_ID } from '../seed/seed';

// Covers the supervisor's "group payment" variant - selecting multiple supervised participants
// (plus themselves) and generating one shared reference. Distinct participant-selection logic
// from the "single" payment already covered in payment.spec.ts.
test('a supervisor can generate a group payment reference covering themselves and a supervised participant', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID), {
		startUrl: `/dashboard/${E2E_CONFERENCE_ID}/payment`
	});

	const feeRes = await page.request.post('/api/graphql', {
		data: {
			query: `query { conference(id: "${E2E_CONFERENCE_ID}") { feeAmount } }`
		}
	});
	const feeAmount = (await feeRes.json())?.data?.conference?.feeAmount as number;
	expect(feeAmount).toBeGreaterThan(0);

	// Paying for others selects the supervisor + all supervised participants - wait for that
	// default selection instead of driving the multi-select UI by hand.
	await openPaymentFlow(page, { conferenceId: E2E_CONFERENCE_ID, payForOthers: true });
	const { amount } = await createReference(page);
	// >=2x rather than exactly 2x: this supervisor's supervised-participant count can grow if
	// connect-supervisor.spec.ts's own dynamic connection happened to run earlier in the suite
	// (same supervisor fixture) - the point here is proving multi-person selection worked at all.
	expect(amount).toBeGreaterThanOrEqual(feeAmount * 2 - 0.01);
});
