import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser } from '../support/auth';
import {
	E2E_AGENDA_ITEM_ID,
	E2E_COMMITTEE_ASSIGN_HEAD_USER_ID,
	E2E_COMMITTEE_ASSIGN_MEMBER_ID,
	E2E_ASSIGNMENT_ADMIN_ID,
	E2E_CONFERENCE_ID,
	E2E_CONNECT_PARTICIPANT_ID,
	E2E_PAPER_DELEGATE_USER_ID,
	E2E_PAPER_DELEGATION_ID,
	E2E_PAPER_REVIEWER_ID,
	E2E_PAYMENT_ADMIN_ID,
	E2E_PREP_CONFERENCE_ID,
	E2E_PREP_PARTICIPANT_USER_ID,
	E2E_SUPERVISED_PARTICIPANT_USER_ID,
	E2E_SUPERVISOR_CONNECTION_CODE,
	E2E_SUPERVISOR_FOR_CONNECT_USER_ID,
	E2E_SURVEY_OPTION_A_ID,
	E2E_SURVEY_QUESTION_ID,
	E2E_MGMT_ADMIN_ID,
	E2E_OTHER_COMMITTEE_AGENDA_ITEM_ID,
	E2E_TEAM_COORDINATOR_ID,
	E2E_TEAMMATE_USER_ID,
	E2E_UNRELEASED_FORMER_SCHOOL_ID,
	E2E_UNSEATED_COMMITTEE_ID
} from '../seed/seed';

// The route guards keep the UI honest; these keep the API honest. Each one sends the request a
// curious participant could type into the browser console, and expects the API to refuse it - or,
// for reads, to hand back nothing it should not. They pin down the rules in
// src/api/services/authHelper/ and the handlers built on them.

type GraphQLResult = { data?: Record<string, unknown> | null; errors?: { message: string }[] };

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

/** Refused, and for the reason the rule gives - not because the request was malformed. */
function expectRefused(result: GraphQLResult, reason: RegExp) {
	expect(result.errors?.[0]?.message, JSON.stringify(result)).toMatch(reason);
}

test('a participant cannot write on somebody else’s behalf', async ({ page }) => {
	await loginAs(page, makeTestUser('authz-writer'));

	// A status row for another user - the create path used to have no check at all.
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!, $u: ID!) {
				upsertConferenceParticipant(conferenceId: $c, userId: $u, paymentStatus: DONE) { id }
			}`,
			{ c: E2E_CONFERENCE_ID, u: E2E_CONNECT_PARTICIPANT_ID }
		),
		/requires one of|you may not change it/
	);

	// A survey answer for another participant.
	expectRefused(
		await gql(
			page,
			`mutation ($q: ID!, $u: ID!, $o: ID!) {
				upsertSurveyAnswer(questionId: $q, userId: $u, optionId: $o) { id }
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
	await loginAs(page, makeTestUser('authz-reader'));

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

test('co-delegates see each other’s names and email addresses, no other contact details', async ({
	browser
}) => {
	const head = await (await browser.newContext()).newPage();
	const member = await (await browser.newContext()).newPage();
	await loginAs(head, makeTestUser('authz-head'));
	const memberClaims = makeTestUser('authz-member');
	await loginAs(member, memberClaims);

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
			delegation(id: $id) { members { user { id givenName phone emergencyContacts globalNotes birthday } } }
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
			birthday: string | null;
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
	expect(other?.user.birthday).toBeNull();

	// Co-delegates may write to each other: the email address is theirs to read.
	const withEmail = await gql(
		member,
		`query ($id: ID!) { delegation(id: $id) { members { user { id email } } } }`,
		{ id: delegation.id }
	);
	expect(withEmail.errors, JSON.stringify(withEmail)).toBeUndefined();
	const emails = (withEmail.data?.delegation as { members: { user: { email: string } }[] }).members;
	expect(emails.every((m) => m.user.email)).toBe(true);
});

test('a team coordinator cannot hand out project management', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_TEAM_COORDINATOR_ID));

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
	const query = `query ($id: ID!) { conference(id: $id) { title iban bankAccountHolder postalStreet } }`;
	const read = async (post: typeof request.post) =>
		(
			(await (
				await post('/api/graphql', { data: { query, variables: { id: E2E_CONFERENCE_ID } } })
			).json()) as GraphQLResult
		).data?.conference as Record<string, string | null>;

	// Anonymous: the conference is public, its bank and postal details are not.
	const anonymous = await read(request.post.bind(request));
	expect(anonymous.title).toBeTruthy();
	expect(anonymous).toMatchObject({ iban: null, bankAccountHolder: null, postalStreet: null });

	// A member of its team reads them.
	const page = await (await browser.newContext()).newPage();
	await loginAs(page, fixedTestUser(E2E_PAYMENT_ADMIN_ID));
	const member = await read(page.request.post.bind(page.request));
	expect(member.iban).toBeTruthy();
});

test('a reviewer reads delegations without their join codes', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PAPER_REVIEWER_ID));

	// The delegation itself is readable...
	const delegation = await gql(page, `query ($id: ID!) { delegation(id: $id) { id applied } }`, {
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

test('the team uploads resolutions, everybody with a part in it downloads them', async ({
	browser
}) => {
	const as = async (claims: Parameters<typeof loginAs>[1]) => {
		const page = await (await browser.newContext()).newPage();
		await loginAs(page, claims);
		return page;
	};
	const requestUpload = `mutation ($c: ID!, $n: String!, $t: String!, $s: Int!) {
		requestFileUpload(conferenceId: $c, kind: "resolution", field: "content", fileName: $n, mimeType: $t, size: $s) { id uploadUrl }
	}`;
	const create = `mutation ($c: ID!, $f: ID!) {
		createResolution(conferenceId: $c, fileId: $f) { id title }
	}`;
	const pdf = Buffer.from('%PDF-1.4 e2e');
	const pdfUpload = (n: string) => ({
		c: E2E_CONFERENCE_ID,
		n,
		t: 'application/pdf',
		s: pdf.length
	});
	const list = `query ($c: ID!) { resolutions(where: { conferenceId: { eq: $c } }) { id } }`;

	// Participants cannot publish resolutions, though they download them.
	const participant = await as(fixedTestUser(E2E_PAPER_DELEGATE_USER_ID));
	expectRefused(
		await gql(participant, requestUpload, pdfUpload('delegate.pdf')),
		/requires one of: Project Management, Participant Care, Content Lead/
	);

	const management = await as(fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));
	expectRefused(
		await gql(management, requestUpload, { ...pdfUpload('page.html'), t: 'text/html' }),
		/file type cannot be uploaded/
	);
	const fileName = `E2E Resolution ${Date.now()}.pdf`;
	const upload = (await gql(management, requestUpload, pdfUpload(fileName))).data
		?.requestFileUpload as { id: string; uploadUrl: string };

	// Claiming the file before it arrived in the bucket is refused.
	expectRefused(
		await gql(management, create, { c: E2E_CONFERENCE_ID, f: upload.id }),
		/not been uploaded completely/
	);
	// The URL is signed for the announced type and size, so nothing else goes up through it.
	const tampered = await management.request.put(upload.uploadUrl, {
		headers: { 'content-type': 'application/pdf' },
		data: Buffer.concat([pdf, Buffer.from(' and more')])
	});
	expect(tampered.ok()).toBe(false);
	const uploaded = await management.request.put(upload.uploadUrl, {
		headers: { 'content-type': 'application/pdf' },
		data: pdf
	});
	expect(uploaded.ok(), await uploaded.text()).toBe(true);

	const created = await gql(management, create, {
		c: E2E_CONFERENCE_ID,
		f: upload.id
	});
	const resolution = created.data?.createResolution as {
		id: string;
		title: string;
	};
	expect(resolution?.title, JSON.stringify(created)).toMatch(/^E2E Resolution/);

	// A delegate of the conference downloads it straight from the bucket.
	const delegate = await as(fixedTestUser(E2E_PAPER_DELEGATE_USER_ID));
	const delegateView = await gql(
		delegate,
		`query ($id: ID!) { resolution(id: $id) { file { url } } }`,
		{
			id: resolution.id
		}
	);
	const contentUrl = (delegateView.data?.resolution as { file: { url: string } } | undefined)?.file
		.url;
	expect(contentUrl, JSON.stringify(delegateView)).toMatch(/^https?:\/\/.*X-Amz-Signature=/);
	const download = await delegate.request.get(contentUrl ?? '');
	expect(download.headers()['content-type']).toBe('application/pdf');
	expect(Buffer.from(await download.body())).toEqual(pdf);

	// Somebody without a part in the conference sees none of them, so gets no URL either.
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

test('a members-only template hands its URL to members only', async ({ browser }) => {
	const as = async (claims: Parameters<typeof loginAs>[1]) => {
		const page = await (await browser.newContext()).newPage();
		await loginAs(page, claims);
		return page;
	};
	const pdf = Buffer.from('%PDF-1.4 contract');
	const contractUrl = `query ($id: ID!) { conference(id: $id) { contractFile { url } } }`;
	const setContract = `mutation ($id: ID!, $f: ID) { updateConference(id: $id, contractFileId: $f) { id } }`;

	const management = await as(fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));
	const upload = (
		await gql(
			management,
			`mutation ($c: ID!, $s: Int!) {
				requestFileUpload(conferenceId: $c, kind: "conference", field: "contract", fileName: "contract.pdf", mimeType: "application/pdf", size: $s) { id uploadUrl }
			}`,
			{ c: E2E_CONFERENCE_ID, s: pdf.length }
		)
	).data?.requestFileUpload as { id: string; uploadUrl: string };
	const put = await management.request.put(upload.uploadUrl, {
		headers: { 'content-type': 'application/pdf' },
		data: pdf
	});
	expect(put.ok(), await put.text()).toBe(true);
	const saved = await gql(management, setContract, { id: E2E_CONFERENCE_ID, f: upload.id });
	expect(saved.errors, JSON.stringify(saved)).toBeUndefined();

	try {
		// A delegate of the conference gets the template.
		const delegate = await as(fixedTestUser(E2E_PAPER_DELEGATE_USER_ID));
		const forDelegate = await gql(delegate, contractUrl, { id: E2E_CONFERENCE_ID });
		const url = (
			forDelegate.data?.conference as { contractFile: { url: string } | null } | undefined
		)?.contractFile?.url;
		expect(url, JSON.stringify(forDelegate)).toBeTruthy();
		expect(Buffer.from(await (await delegate.request.get(url ?? '')).body())).toEqual(pdf);

		// Anybody else sees the open conference, but the relation behind the masked id is empty.
		const outsider = await as(makeTestUser('authz-templates'));
		const forOutsider = await gql(outsider, contractUrl, { id: E2E_CONFERENCE_ID });
		expect(forOutsider.data?.conference, JSON.stringify(forOutsider)).toEqual({
			contractFile: null
		});
	} finally {
		await gql(management, setContract, { id: E2E_CONFERENCE_ID, f: null });
	}
});

test('a supervisor reaches a student only in the conference they supervise them in', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_SUPERVISOR_FOR_CONNECT_USER_ID));

	// Supervision links the student's part in one conference; their part in another stays theirs.
	const ofStudent = (conferenceId: string) =>
		`conferenceId: { eq: "${conferenceId}" }, userId: { eq: "${E2E_SUPERVISED_PARTICIPANT_USER_ID}" }`;
	// registrations reach conference and person through the participant row
	const registrationOfStudent = (conferenceId: string) =>
		`conference: { id: { eq: "${conferenceId}" } }, user: { id: { eq: "${E2E_SUPERVISED_PARTICIPANT_USER_ID}" } }`;
	const result = await gql(
		page,
		`query {
			supervised: conferenceParticipants(where: { ${ofStudent(E2E_CONFERENCE_ID)} }) { id }
			supervisedRegistration: singleParticipants(where: { ${registrationOfStudent(E2E_CONFERENCE_ID)} }) { id }
			elsewhere: conferenceParticipants(where: { ${ofStudent(E2E_PREP_CONFERENCE_ID)} }) { id }
			elsewhereRegistration: singleParticipants(where: { ${registrationOfStudent(E2E_PREP_CONFERENCE_ID)} }) { id }
		}`
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data).toEqual({
		supervised: [{ id: expect.any(String) }],
		supervisedRegistration: [{ id: expect.any(String) }],
		elsewhere: [],
		elsewhereRegistration: []
	});
});

test('anybody finds schools by name, but only their participants’ care team reads the details', async ({
	page
}) => {
	await loginAs(page, makeTestUser('authz-school-reader'));

	// Applicants pick an existing school, so its name is public...
	const created = await gql(
		page,
		`mutation ($c: ID!) {
			createWaitingListEntry(conferenceId: $c, schoolName: "E2E Schule Ablesbar", motivation: "m", experience: "e") { id }
		}`,
		{ c: E2E_PREP_CONFERENCE_ID }
	);
	const found = await gql(
		page,
		`query { searchSchools(search: "E2E Schule Ablesbar") { id name notes contactEmail street } }`
	);
	expect(found.errors, JSON.stringify(found)).toBeUndefined();
	const schools = found.data?.searchSchools;
	// The waiting list may be closed for this conference; then the school was never created and
	// there is nothing to read - the rule below still holds for every school there is.
	if (!created.errors) {
		expect(schools).toEqual(
			expect.arrayContaining([expect.objectContaining({ name: 'E2E Schule Ablesbar' })])
		);
	}

	// ...while address, contact and the team's notes stay with the team.
	const any = await gql(page, `query { schools(limit: 25) { notes contactEmail street } }`);
	expect(any.errors, JSON.stringify(any)).toBeUndefined();
	for (const school of [
		...(Array.isArray(schools) ? schools : []),
		...(Array.isArray(any.data?.schools) ? any.data.schools : [])
	]) {
		expect(school).toMatchObject({ notes: null, contactEmail: null, street: null });
	}

	// Nor may they edit or merge one.
	expectRefused(
		await gql(page, `mutation { updateSchool(id: "missing", notes: "x") { id } }`),
		/not found/i
	);

	// A school of one's own only exists in a conference one takes part in: the waiting list
	// gives no participant row to set it on.
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!) { setParticipantSchool(conferenceId: $c, schoolName: "x") { id } }`,
			{
				c: E2E_PREP_CONFERENCE_ID
			}
		),
		/not found/i
	);
});

test('participant care no longer reaches the school of somebody whose registration ended', async ({
	page
}) => {
	// The only one naming the school is a participant row of the unreleased conference without a
	// registration; the admin is participant care there.
	await loginAs(page, fixedTestUser(E2E_ASSIGNMENT_ADMIN_ID));

	const read = await gql(page, `query ($id: ID!) { school(id: $id) { name notes } }`, {
		id: E2E_UNRELEASED_FORMER_SCHOOL_ID
	});
	expect(read.errors, JSON.stringify(read)).toBeUndefined();
	expect(read.data?.school).toEqual({ name: 'E2E Schule Ehemalig', notes: null });

	expectRefused(
		await gql(page, `mutation ($id: ID!) { updateSchool(id: $id, notes: "x") { id } }`, {
			id: E2E_UNRELEASED_FORMER_SCHOOL_ID
		}),
		/not found/i
	);
});

test('participant care does not look after the team; the team admins read it without care notes', async ({
	browser
}) => {
	type Teammate = {
		givenName: string;
		phone: string | null;
		street: string | null;
		globalNotes: string | null;
	} | null;
	const readTeammate = async (actorId: string) => {
		const page = await (await browser.newContext()).newPage();
		await loginAs(page, fixedTestUser(actorId));
		const result = await gql(
			page,
			`query ($id: ID!) { user(id: $id) { givenName phone street globalNotes } }`,
			{ id: E2E_TEAMMATE_USER_ID }
		);
		expect(result.errors, JSON.stringify(result)).toBeUndefined();
		return { page, user: result.data?.user as Teammate };
	};

	// Participant care reads a teammate like any teammate does: who they are and their phone.
	const care = await readTeammate(E2E_MGMT_ADMIN_ID);
	expect(care.user?.givenName).toBeTruthy();
	expect(care.user?.phone).toBeTruthy();
	expect(care.user?.street).toBeNull();
	expect(care.user?.globalNotes).toBeNull();
	// ... and may neither write care notes about them nor correct who they are.
	expectRefused(
		await gql(
			care.page,
			`mutation ($id: ID!) { updateUsersGlobalNotes(id: $id, globalNotes: "x") { id } }`,
			{ id: E2E_TEAMMATE_USER_ID }
		),
		/do not look after them/
	);

	// The team admins read the planning details, never the care notes.
	for (const adminId of [E2E_ASSIGNMENT_ADMIN_ID, E2E_TEAM_COORDINATOR_ID]) {
		const { user } = await readTeammate(adminId);
		expect(user?.street, adminId).toBeTruthy();
		expect(user?.globalNotes, adminId).toBeNull();
	}
});

test('nobody registers into a conference that is not taking applications', async ({ page }) => {
	// Registering makes the caller a participant, which opens the conference's members-only
	// details to them; the preparation conference has closed its registration.
	await loginAs(page, makeTestUser('authz-late-registrant'));
	const closed = /registration period is closed/;

	expectRefused(
		await gql(page, `mutation ($c: ID!) { createDelegation(conferenceId: $c) { id } }`, {
			c: E2E_PREP_CONFERENCE_ID
		}),
		closed
	);
	expectRefused(
		await gql(page, `mutation ($c: ID!) { createConferenceSupervisor(conferenceId: $c) { id } }`, {
			c: E2E_PREP_CONFERENCE_ID
		}),
		closed
	);
	expectRefused(
		await gql(
			page,
			`mutation ($c: ID!, $code: String!) {
				createDelegationMember(conferenceId: $c, entryCode: $code) { id }
			}`,
			{ c: E2E_PREP_CONFERENCE_ID, code: 'ABCDEFGH' }
		),
		closed
	);
});

test('a head delegate seats members only in committees that seat their delegation', async ({
	page
}) => {
	// The member has no committee yet, so the head delegate may move them; the committee is one of
	// the conference's, but it does not seat the delegation's nation.
	await loginAs(page, fixedTestUser(E2E_COMMITTEE_ASSIGN_HEAD_USER_ID));
	const unseated = /committee does not belong/i;

	expectRefused(
		await gql(
			page,
			`mutation ($id: ID!, $c: ID!) {
				updateDelegationMemberCommittee(id: $id, assignedCommitteeId: $c) { id }
			}`,
			{ id: E2E_COMMITTEE_ASSIGN_MEMBER_ID, c: E2E_UNSEATED_COMMITTEE_ID }
		),
		unseated
	);
	expectRefused(
		await gql(
			page,
			`mutation ($conf: ID!, $id: ID!, $c: ID) {
				assignCommitteesToDelegationMembers(
					conferenceId: $conf
					assignments: [{ delegationMemberId: $id, committeeId: $c }]
				) { id }
			}`,
			{
				conf: E2E_CONFERENCE_ID,
				id: E2E_COMMITTEE_ASSIGN_MEMBER_ID,
				c: E2E_UNSEATED_COMMITTEE_ID
			}
		),
		unseated
	);
});

test('a delegate writes papers only on their committee’s agenda items, as their role allows', async ({
	page
}) => {
	// The paper delegate represents a nation and sits in E2E_COMMITTEE_ID. The other agenda item is
	// one of the conference's, in a committee that even seats the same nation.
	await loginAs(page, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID));
	const create = (type: string, agendaItemId: string | null) =>
		gql(
			page,
			`mutation ($c: ID!, $a: ID!, $d: ID!, $i: ID) {
				createPaper(conferenceId: $c, authorId: $a, delegationId: $d, agendaItemId: $i,
					type: ${type}, content: {}, status: DRAFT) { id }
			}`,
			{
				c: E2E_CONFERENCE_ID,
				a: E2E_PAPER_DELEGATE_USER_ID,
				d: E2E_PAPER_DELEGATION_ID,
				i: agendaItemId
			}
		);

	expectRefused(
		await create('POSITION_PAPER', E2E_OTHER_COMMITTEE_AGENDA_ITEM_ID),
		/agenda items of your own committee/
	);
	expectRefused(await create('INTRODUCTION_PAPER', null), /Only non-state actors/);
});
