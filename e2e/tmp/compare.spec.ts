import { test } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';
test('compare', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }));
	const q = `query { delegations(where: { conferenceId: { eq: "${E2E_CONFERENCE_ID}" }, assignedRole: { kind: NATION } }) { id members { id user { id givenName familyName } } } }`;
	const outs: string[] = [];
	for (let i = 0; i < 3; i++) {
		const r = await page.request.post('/api/graphql', { data: { query: q } });
		outs.push(await r.text());
	}
	console.log('SAME', outs[0] === outs[1], outs[1] === outs[2]);
	console.log('OUT', outs[0].slice(0, 1500));
});
