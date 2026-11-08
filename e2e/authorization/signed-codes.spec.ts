import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_ATTENDANCE_ADA_ID,
	E2E_ATTENDANCE_CARE_ID,
	E2E_ATTENDANCE_CONFERENCE_ID
} from '../seed/attendance';

// What identifies a participant is a signed code, and a scan has to be genuine to count: the
// server checks the codes it is handed again, and a code's link (what a phone's camera app opens)
// leads only the team anywhere, without telling anybody else whether the code is genuine.

type GraphQLResult = {
	data?: Record<string, Record<string, unknown> | null> | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const conferenceId = E2E_ATTENDANCE_CONFERENCE_ID;

async function nametagCode(page: Page) {
	const result = await gql(
		page,
		`mutation ($c: ID!) { issueNametagCode(conferenceId: $c) { code } }`,
		{ c: conferenceId }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return String(result.data?.issueNametagCode?.code);
}

async function documentCode(page: Page, userId: string) {
	return gql(
		page,
		`mutation ($c: ID!, $u: ID!) { issueDocumentCode(conferenceId: $c, userId: $u) { code } }`,
		{ c: conferenceId, u: userId }
	);
}

const lookup = (page: Page, code: string) =>
	gql(
		page,
		`query ($c: ID!, $code: String!) {
			scanLookup(conferenceId: $c, code: $code) { found userId }
		}`,
		{ c: conferenceId, code }
	);

/** The code with one character changed, which breaks its signature. */
const changedAt = ({ code, index }: { code: string; index: number }) =>
	code.slice(0, index) + (code[index] === '0' ? '1' : '0') + code.slice(index + 1);
const tampered = (code: string) => changedAt({ code, index: 80 });
/** A character of the signature changed, the claims left readable: a forgery. */
const forgedSignature = (code: string) => changedAt({ code, index: code.length - 20 });

test('the scanner lookup takes a genuine nametag code and refuses a tampered or wrong one', async ({
	browser
}) => {
	const ada = await (await browser.newContext()).newPage();
	await loginAs(ada, fixedTestUser(E2E_ATTENDANCE_ADA_ID));
	const care = await (await browser.newContext()).newPage();
	await loginAs(care, fixedTestUser(E2E_ATTENDANCE_CARE_ID));

	const code = await nametagCode(ada);
	const genuine = await lookup(care, `HTTPS://EXAMPLE.ORG/ID/${code}`);
	expect(genuine.errors, JSON.stringify(genuine)).toBeUndefined();
	expect(genuine.data?.scanLookup).toEqual({ found: true, userId: E2E_ATTENDANCE_ADA_ID });

	const forged = await lookup(care, forgedSignature(code));
	expect(forged.errors?.[0]?.extensions?.code).toBe('INVALID_INPUT');
	// garbled claims are no signed code at all, so the text is looked up as the user id it may be
	const garbled = await lookup(care, tampered(code));
	expect(garbled.errors, JSON.stringify(garbled)).toBeUndefined();
	expect(garbled.data?.scanLookup?.found).toBe(false);

	// The application documents' code is no nametag
	const documents = await documentCode(ada, E2E_ATTENDANCE_ADA_ID);
	expect(documents.errors, JSON.stringify(documents)).toBeUndefined();
	const wrongKind = await lookup(care, String(documents.data?.issueDocumentCode?.code));
	expect(wrongKind.errors?.[0]?.extensions?.code).toBe('INVALID_INPUT');

	// A printed nametag's barcode is the plain user id, which still counts
	const printed = await lookup(care, E2E_ATTENDANCE_ADA_ID);
	expect(printed.data?.scanLookup).toEqual({ found: true, userId: E2E_ATTENDANCE_ADA_ID });
});

test("nobody but the holder and participant care gets a person's document code", async ({
	browser
}) => {
	const ada = await (await browser.newContext()).newPage();
	await loginAs(ada, fixedTestUser(E2E_ATTENDANCE_ADA_ID));
	const own = await documentCode(ada, E2E_ATTENDANCE_ADA_ID);
	expect(own.errors, JSON.stringify(own)).toBeUndefined();
	const someoneElses = await documentCode(ada, E2E_ATTENDANCE_CARE_ID);
	expect(someoneElses.errors?.[0]?.extensions?.code).toBe('FORBIDDEN');

	const care = await (await browser.newContext()).newPage();
	await loginAs(care, fixedTestUser(E2E_ATTENDANCE_CARE_ID));
	const forAda = await documentCode(care, E2E_ATTENDANCE_ADA_ID);
	expect(forAda.errors, JSON.stringify(forAda)).toBeUndefined();
});

test("a code's link signs the visitor in first and leads only the team to the person", async ({
	browser
}) => {
	const ada = await (await browser.newContext()).newPage();
	await loginAs(ada, fixedTestUser(E2E_ATTENDANCE_ADA_ID));
	const code = await nametagCode(ada);
	const documents = await documentCode(ada, E2E_ATTENDANCE_ADA_ID);
	const printCode = String(documents.data?.issueDocumentCode?.code);

	// Signed out, genuine or not, the link only asks for a login
	const visitor = await (await browser.newContext()).newPage();
	for (const link of [`/ID/${code}`, `/ID/${tampered(code)}`]) {
		await visitor.goto(link);
		expect(visitor.url()).toMatch(/\/oidc|\/login/);
	}

	// The holder is no team member: refused, whatever the code
	const own = await ada.goto(`/ID/${code}`);
	expect(own?.status()).toBe(403);

	const care = await (await browser.newContext()).newPage();
	await loginAs(care, fixedTestUser(E2E_ATTENDANCE_CARE_ID));
	await care.goto(`/ID/${code}`);
	expect(new URL(care.url()).pathname).toBe(
		`/dashboard/${conferenceId}/team/user/${E2E_ATTENDANCE_ADA_ID}`
	);
	await care.goto(`/id/${printCode.toLowerCase()}`);
	const postal = new URL(care.url());
	expect(postal.pathname).toBe(`/dashboard/${conferenceId}/team/postal-registration`);
	expect(postal.searchParams.get('queryUserId')).toBe(E2E_ATTENDANCE_ADA_ID);

	const forged = await care.goto(`/ID/${forgedSignature(code)}`);
	expect(forged?.status()).toBe(400);
	// the claims garbled (here the conference id, into a NUL): no code at all
	const garbled = await care.goto(`/ID/${tampered(code)}`);
	expect(garbled?.status()).toBe(404);
});
