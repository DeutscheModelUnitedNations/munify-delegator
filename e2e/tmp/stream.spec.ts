import { test } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { E2E_ASSIGNMENT_ADMIN_ID, E2E_CONFERENCE_ID } from '../seed/seed';
test('stream', async ({ page }) => {
	await page.addInitScript(() => {
		const orig = window.fetch;
		window.fetch = async (...args) => {
			const res = await orig(...args);
			const url = String(args[0] instanceof Request ? args[0].url : args[0]);
			if (url.includes('/api/graphql/stream') && res.body) {
				const [a, b] = res.body.tee();
				const reader = b.getReader();
				const dec = new TextDecoder();
				(async () => {
					for (;;) {
						const { done, value } = await reader.read();
						if (done) break;
						console.log('SSE ' + performance.now().toFixed(0) + ' ' + dec.decode(value).slice(0, 400).replace(/\n/g, ' '));
					}
				})();
				return new Response(a, { headers: res.headers, status: res.status });
			}
			if (url.includes('/api/graphql')) {
				const body = args[0] instanceof Request ? await args[0].clone().text() : typeof args[1]?.body === 'string' ? args[1].body : String(args[1]?.method) + ' ' + url;
				console.log('REQ ' + performance.now().toFixed(0) + ' ' + body.replace(/\\s+/g,' ').slice(0, 260));
			}
			return res;
		};
	});
	page.on('console', (m) => { if (/^(SSE|REQ)/.test(m.text())) console.log(m.text()); });
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 60)));
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }));
	console.log('GOTO');
	await page.goto(`/dashboard/${E2E_CONFERENCE_ID}/team/seats`);
	await page.waitForTimeout(5000);
});
test('seats still works', async ({ page }) => {
	page.on('pageerror', (e) => console.log('PAGEERROR', e.message.slice(0, 60)));
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }));
	await page.goto(`/dashboard/${E2E_CONFERENCE_ID}/team/seats`);
	await page.waitForTimeout(4000);
	await page.screenshot({ path: '/tmp/claude-1000/-home-m1212e-Documents-Coding-munify-delegator/1d31b898-1668-4f9f-b501-d4f0180109fa/scratchpad/seats.png', fullPage: true });
	console.log('TEXT', (await page.locator('main, body').first().innerText()).replace(/\s+/g, ' ').slice(0, 800));
});
test('ssr html', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }));
	const r = await page.request.get(`/dashboard/${E2E_CONFERENCE_ID}/team/seats`);
	const html = await r.text();
	console.log('HTML len', html.length, r.status()); for (const w of ['Deutschland', 'DEU', 'Sitzplanung', 'TJ<']) {
		const i = html.indexOf(w);
		console.log('HTML', w, i, i >= 0 ? html.slice(Math.max(0, i - 300), i + 200).replace(/\s+/g, ' ') : '');
	}
});
test('ssr vs api', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID, { roles: ['admin'] }));
	const html = await (await page.request.get(`/dashboard/${E2E_CONFERENCE_ID}/team/seats`)).text();
	console.log('SSRTIPS', [...html.matchAll(/data-tip="([^"]+)"/g)].map((m) => m[1]).join(' | '));
	const q = `query { delegations(where: { conferenceId: { eq: "${E2E_CONFERENCE_ID}" }, assignedRole: { kind: NATION } }) { id assignedRoleId members { id assignedCommittee { id } user { id givenName familyName } } } }`;
	console.log('API', await (await page.request.post('/api/graphql', { data: { query: q } })).text());
});
