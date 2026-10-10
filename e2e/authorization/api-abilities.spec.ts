import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser } from '../support/auth';
import {
	E2E_AGENDA_ITEM_ID,
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_CONFERENCE_ID,
	E2E_CONNECT_PARTICIPANT_ID,
	E2E_PAPER_DELEGATE_USER_ID,
	E2E_PAPER_DELEGATION_ID,
	E2E_PAPER_REVIEWER_ID,
	E2E_PAYMENT_ADMIN_ID,
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_SUPERVISOR_CONNECTION_CODE,
	E2E_SURVEY_OPTION_A_ID,
	E2E_SURVEY_QUESTION_ID,
	E2E_TEAM_COORDINATOR_ID
} from '../seed/seed';

// The route guards keep the UI honest; these keep the API honest. Each one sends the request a
// curious participant could type into the browser console, and expects the API to refuse it - or,
// for reads, to hand back nothing it should not. They pin down the rules in
// src/api/services/authHelper.ts and the handlers built on them.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', { data: { query, variables } });
	return (await res.json()) as GraphQLResult;
}

/** Refused, and for the reason the rule gives - not because the request was malformed. */
function expectRefused(result: GraphQLResult, reason: RegExp) {
	expect(result.errors?.[0]?.message, JSON.stringify(result)).toMatch(reason);
}

test('a participant cannot write on somebody else’s behalf', async ({ page }) => {
	await loginAs(page, makeTestUser('authz-writer'), { startUrl: '/login?next=/dashboard' });

	// A status row for another user - the create path used to have no check at all.
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!, $u: ID!) {
				updateConferenceParticipantStatus(conferenceId: $c, userId: $u, paymentStatus: DONE) { id }
			}`,
			{ c: E2E_CONFERENCE_ID, u: E2E_CONNECT_PARTICIPANT_ID }
		),
		/requires one of|not yours to update/
	);

	// A survey answer for another participant.
	expectRefused(
		await gql(
			page,
			`mutation ($q: ID!, $u: ID!, $o: ID!) {
				updateSurveyAnswer(questionId: $q, userId: $u, optionId: $o) { id }
			}`,
			{ q: E2E_SURVEY_QUESTION_ID, u: E2E_PREP_PARTICIPANT_USER_ID, o: E2E_SURVEY_OPTION_A_ID }
		),
		/only answer surveys for yourself/
	);

	// A paper in another delegate's name, for a delegation the caller is not in.
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!, $a: ID!, $d: ID!, $i: ID) {
				createPaper(conferenceId: $c, authorId: $a, delegationId: $d, agendaItemId: $i,
					type: POSITION_PAPER, content: {}) { id }
			}`,
			{
				c: E2E_CONFERENCE_ID,
				a: E2E_PAPER_DELEGATE_USER_ID,
				d: E2E_PAPER_DELEGATION_ID,
				i: E2E_AGENDA_ITEM_ID
			}
		),
		/in your own name/
	);

	// Attaching another participant to a supervisor with a known code.
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!, $code: String!, $u: ID) {
				connectToConferenceSupervisor(conferenceId: $c, connectionCode: $code, userId: $u) { id }
			}`,
			{ c: E2E_CONFERENCE_ID, code: E2E_SUPERVISOR_CONNECTION_CODE, u: E2E_CONNECT_PARTICIPANT_ID }
		),
		/requires one of/
	);

	// A payment reference in another person's name.
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!, $u: ID!) {
				createPaymentTransaction(conferenceId: $c, userId: $u, paymentFor: [$u]) { id }
			}`,
			{ c: E2E_CONFERENCE_ID, u: E2E_CONNECT_PARTICIPANT_ID }
		),
		/in your own name/
	);

	// Subscribing somebody else to the newsletter.
	expectRefused(
		await gql(
			page,
			`mutation ($e: EmailAddress!) {
				updateUsersNewsletterPreferences(email: $e, wantsToReceiveGeneralInformation: true)
			}`,
			{ e: `${E2E_CONNECT_PARTICIPANT_ID}@e2e.test` }
		),
		/Only the account itself/
	);
});

test('a participant reads nothing of conferences they are not part of', async ({ page }) => {
	await loginAs(page, makeTestUser('authz-reader'), { startUrl: '/login?next=/dashboard' });

	const result = await gql(
		page,
		`query { surveyQuestions(where: { conferenceId: { eq: "${E2E_PREP_CONFERENCE_ID}" } }) { id } }`
	);
	expect(result.data?.surveyQuestions, JSON.stringify(result)).toEqual([]);
});

test('unsubscribing works without a session and does not reveal accounts', async ({ request }) => {
	for (const email of [`${E2E_CONNECT_PARTICIPANT_ID}@e2e.test`, 'nobody-at-all@e2e.test']) {
		const res = await request.post('/api/graphql', {
			data: {
				query: `mutation ($e: EmailAddress!) {
					updateUsersNewsletterPreferences(email: $e, wantsToReceiveGeneralInformation: false)
				}`,
				variables: { e: email }
			}
		});
		expect(await res.json()).toEqual({ data: { updateUsersNewsletterPreferences: true } });
	}
});

test('co-delegates see each other’s names, not each other’s contact details', async ({
	browser
}) => {
	const head = await (await browser.newContext()).newPage();
	const member = await (await browser.newContext()).newPage();
	await loginAs(head, makeTestUser('authz-head'), { startUrl: '/login?next=/dashboard' });
	const memberClaims = makeTestUser('authz-member');
	await loginAs(member, memberClaims, { startUrl: '/login?next=/dashboard' });

	const created = await gql(
		head,
		`mutation ($c: ID!) { createDelegation(conferenceId: $c) { id entryCode } }`,
		{ c: E2E_CONFERENCE_ID }
	);
	const delegation = created.data?.createDelegation as { id: string; entryCode: string };
	expect(delegation?.entryCode, JSON.stringify(created)).toBeTruthy();

	const joined = await gql(
		member,
		`mutation ($c: ID!, $code: String!) {
			createDelegationMember(conferenceId: $c, entryCode: $code) { id }
		}`,
		{ c: E2E_CONFERENCE_ID, code: delegation.entryCode }
	);
	expect(joined.errors, JSON.stringify(joined)).toBeUndefined();

	const read = await gql(
		member,
		`query ($id: ID!) {
			delegation(id: $id) { members { user { id givenName phone emergencyContacts globalNotes } } }
		}`,
		{ id: delegation.id }
	);
	type Member = {
		user: {
			id: string;
			givenName: string;
			phone: string | null;
			emergencyContacts: string | null;
			globalNotes: string | null;
		};
	};
	const members = (read.data?.delegation as { members: Member[] }).members;
	const own = members.find((m) => m.user.id === memberClaims.preferred_username);
	const other = members.find((m) => m.user.id !== memberClaims.preferred_username);

	expect(own?.user.phone).toBeTruthy();
	expect(own?.user.globalNotes).toBeNull();
	expect(other?.user.givenName).toBeTruthy();
	expect(other?.user.phone).toBeNull();
	expect(other?.user.emergencyContacts).toBeNull();
});

test('a team coordinator cannot hand out project management', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_TEAM_COORDINATOR_ID), {
		startUrl: '/login?next=/dashboard'
	});

	const invited = await gql(
		page,
		`mutation ($c: ID!) {
			createTeamMemberInvitations(conferenceId: $c,
				invitations: [{ email: "authz-would-be-pm@e2e.test", role: PROJECT_MANAGEMENT }]) {
				created { id }
				errors { error }
			}
		}`,
		{ c: E2E_CONFERENCE_ID }
	);
	const outcome = invited.data?.createTeamMemberInvitations as {
		created: unknown[];
		errors: unknown[];
	};
	expect(outcome.created).toEqual([]);
	expect(outcome.errors).toHaveLength(1);
});

test('payment details and documents are for people with a part in the conference', async ({
	browser,
	request
}) => {
	const query = `query ($id: ID!) { conference(id: $id) { title iban accountHolder postalStreet } }`;
	const read = async (post: typeof request.post) =>
		(
			(await (
				await post('/api/graphql', { data: { query, variables: { id: E2E_CONFERENCE_ID } } })
			).json()) as GraphQLResult
		).data?.conference as Record<string, string | null>;

	// Anonymous: the conference is public, its bank and postal details are not.
	const anonymous = await read(request.post.bind(request));
	expect(anonymous.title).toBeTruthy();
	expect(anonymous).toMatchObject({ iban: null, accountHolder: null, postalStreet: null });

	// A member of its team reads them.
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(E2E_PAYMENT_ADMIN_ID), { startUrl: '/login?next=/dashboard' });
	const member = await read(page.request.post.bind(page.request));
	expect(member.iban).toBeTruthy();
});

test('a reviewer reads delegations without their join codes', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PAPER_REVIEWER_ID), { startUrl: '/login?next=/dashboard' });

	// The delegation itself is readable...
	const delegation = await gql(page, `query ($id: ID!) { delegation(id: $id) { id school } }`, {
		id: E2E_PAPER_DELEGATION_ID
	});
	expect(delegation.data?.delegation, JSON.stringify(delegation)).toMatchObject({
		id: E2E_PAPER_DELEGATION_ID
	});

	// ...its join code is masked for this row, and a non-null column that is masked cannot be
	// selected at all.
	expectRefused(
		await gql(page, `query ($id: ID!) { delegation(id: $id) { id entryCode } }`, {
			id: E2E_PAPER_DELEGATION_ID
		}),
		/non-nullable field Delegation\.entryCode/
	);
});

test('project management uploads resolutions, everybody with a part in it downloads them', async ({
	browser
}) => {
	const as = async (claims: Parameters<typeof loginAs>[1]) => {
		const page = await (await browser.newContext()).newPage();
		await loginAs(page, claims, { startUrl: '/login?next=/dashboard' });
		return page;
	};
	const create = `mutation ($c: ID!, $n: String!, $content: String!) {
		createResolution(conferenceId: $c, fileName: $n, content: $content) { id title }
	}`;
	const pdf = `data:application/pdf;base64,${Buffer.from('%PDF-1.4 e2e').toString('base64')}`;
	const list = `query ($c: ID!) { resolutions(where: { conferenceId: { eq: $c } }) { id } }`;

	// Participant care runs the conference with project management, but the resolutions are not
	// theirs to publish.
	const care = await as(fixedTestUser(E2E_PAYMENT_ADMIN_ID));
	expectRefused(
		await gql(care, create, { c: E2E_CONFERENCE_ID, n: 'care.pdf', content: pdf }),
		/requires one of: PROJECT_MANAGEMENT/
	);

	const management = await as(fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));
	expectRefused(
		await gql(management, create, {
			c: E2E_CONFERENCE_ID,
			n: 'page.html',
			content: 'data:text/html;base64,PGgxPg=='
		}),
		/Only PDF files/
	);
	const created = await gql(management, create, {
		c: E2E_CONFERENCE_ID,
		n: `E2E Resolution ${Date.now()}.pdf`,
		content: pdf
	});
	const resolution = created.data?.createResolution as { id: string; title: string };
	expect(resolution?.title, JSON.stringify(created)).toMatch(/^E2E Resolution/);

	// A delegate of the conference downloads it.
	const delegate = await as(fixedTestUser(E2E_PAPER_DELEGATE_USER_ID));
	const download = await gql(delegate, `query ($id: ID!) { resolution(id: $id) { content } }`, {
		id: resolution.id
	});
	expect(download.data?.resolution, JSON.stringify(download)).toEqual({ content: pdf });

	// Somebody without a part in the conference sees none of them.
	const outsider = await as(makeTestUser('authz-resolutions'));
	const outsiderList = await gql(outsider, list, { c: E2E_CONFERENCE_ID });
	expect(outsiderList.data?.resolutions, JSON.stringify(outsiderList)).toEqual([]);

	expect(
		(
			await gql(management, `mutation ($id: ID!) { deleteResolution(id: $id) }`, {
				id: resolution.id
			})
		).data?.deleteResolution
	).toBe(true);
});
