import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs, makeTestUser } from '../support/auth';
import {
	E2E_PAPERS_ACCEPTED_TEXT,
	E2E_PAPERS_AUTHOR_DELEGATION_ID,
	E2E_PAPERS_CONFERENCE_ID,
	E2E_PAPERS_DRAFT_PAPER_ID,
	E2E_PAPERS_PEOPLE,
	E2E_PAPERS_SUBMITTED_PAPER_ID,
	E2E_PAPERS_UNRELEASED_CONFERENCE_ID,
	E2E_PAPERS_UNRELEASED_PAPER_ID,
	E2E_PAPERS_VERSION_IDS
} from '../seed/conferencePapers';

// The paper hub's "conference papers": everybody with a seat in a conference reads every paper
// handed in there, as it stands - the latest submitted version, and nothing around it. Drafts,
// earlier versions, the reviews and the verdict stay with the author, the delegation, its
// supervisors and the paper team. The rules are in src/api/handlers/paper/paperPermissions.ts and
// paperVersion/paperVersionPermissions.ts; the fixture is e2e/seed/conferencePapers.ts.

type GraphQLResult = {
	data?: Record<string, unknown> | null;
	errors?: { message: string; path?: (string | number)[]; extensions?: { code?: string } }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

type ListedPaper = { id: string; versions: { id: string }[] };
type PaperGroups = { agendaItems: { papers: ListedPaper[] }[] }[];

/** The papers the conference view lists for the caller, with the versions each comes with. */
async function conferencePapers(page: Page, conferenceId = E2E_PAPERS_CONFERENCE_ID) {
	const result = await gql(
		page,
		`query ($c: ID!) {
			findPapersGroupedByCommittee(conferenceId: $c) {
				agendaItems { papers { id type firstSubmittedAt versions { id } } }
			}
		}`,
		{ c: conferenceId }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	const groups = result.data?.findPapersGroupedByCommittee as PaperGroups;
	return groups.flatMap((group) => group.agendaItems.flatMap((item) => item.papers));
}

/** The paper as the read-only view asks for it; null when the caller may not read it. */
async function viewedPaper(page: Page, id: string) {
	const result = await gql(
		page,
		`query ($id: ID!) {
			paper(id: $id) {
				id
				type
				delegation { id assignedRole { kind nation { alpha3Code } } }
				agendaItem { title committee { abbreviation } }
				versions(orderBy: { version: desc }, limit: 1) { id content }
			}
		}`,
		{ id }
	);
	return (result.data?.paper ?? null) as
		| (ListedPaper & {
				delegation: { id: string; assignedRole: { nation: { alpha3Code: string } } };
				versions: { id: string; content: string }[];
		  })
		| null;
}

const onlyTheAcceptedVersion = [{ id: E2E_PAPERS_VERSION_IDS.accepted }];

for (const [who, userId] of [
	['a delegate of another delegation', E2E_PAPERS_PEOPLE.delegate],
	['a single participant with a role', E2E_PAPERS_PEOPLE.single],
	['the supervisor of a seated delegate', E2E_PAPERS_PEOPLE.supervisor]
] as const) {
	test(`${who} reads the submitted papers of the conference, as they stand`, async ({ page }) => {
		await loginAs(page, fixedTestUser(userId));

		// the list: the paper that was handed in, with its latest submitted version; no draft
		expect(await conferencePapers(page)).toEqual([
			expect.objectContaining({
				id: E2E_PAPERS_SUBMITTED_PAPER_ID,
				versions: onlyTheAcceptedVersion
			})
		]);

		// the read-only view: the text, under the role of the delegation that wrote it
		const paper = await viewedPaper(page, E2E_PAPERS_SUBMITTED_PAPER_ID);
		expect(paper?.delegation).toMatchObject({
			id: E2E_PAPERS_AUTHOR_DELEGATION_ID,
			assignedRole: { nation: { alpha3Code: 'DEU' } }
		});
		expect(paper?.versions.map((version) => version.id)).toEqual([E2E_PAPERS_VERSION_IDS.accepted]);
		expect(paper?.versions[0]?.content).toContain(E2E_PAPERS_ACCEPTED_TEXT);

		// a draft is its author's
		expect(await viewedPaper(page, E2E_PAPERS_DRAFT_PAPER_ID)).toBeNull();
	});
}

test('a reader of the conference papers gets neither earlier versions, reviews nor the verdict', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.delegate));
	const id = E2E_PAPERS_SUBMITTED_PAPER_ID;

	// every version there is to read, and the reviews of it: one version, no review
	const versions = await gql(
		page,
		`query ($id: ID!) { paper(id: $id) { versions { id version reviews { id } } } }`,
		{ id }
	);
	expect(versions.errors, JSON.stringify(versions)).toBeUndefined();
	expect(versions.data?.paper).toEqual({
		versions: [{ id: E2E_PAPERS_VERSION_IDS.accepted, version: 2, reviews: [] }]
	});

	// The status is the reviewers' verdict, on the paper and on its version. A masked non-null
	// column cannot be selected; production masks the message, so the error goes by its path.
	const status = await gql(page, `query ($id: ID!) { paper(id: $id) { id status } }`, { id });
	expect(status.data?.paper ?? null, JSON.stringify(status)).toBeNull();
	expect(status.errors?.[0]?.path, JSON.stringify(status)).toEqual(['paper', 'status']);
	const versionStatus = await gql(
		page,
		`query ($id: ID!) { paper(id: $id) { versions { id status } } }`,
		{ id }
	);
	expect(JSON.stringify(versionStatus)).not.toContain('ACCEPTED');
	expect(versionStatus.errors?.length, JSON.stringify(versionStatus)).toBeGreaterThan(0);

	// who of the delegation wrote it stays with them
	const author = await gql(
		page,
		`query ($id: ID!) { paper(id: $id) { id author { id } authorParticipant { id } } }`,
		{ id }
	);
	expect(JSON.stringify(author)).not.toContain(E2E_PAPERS_PEOPLE.author);

	// nor can the verdict be found by filtering for it
	const accepted = await gql(
		page,
		`query ($c: ID!) {
			papers(where: { conference: { id: { eq: $c } }, status: ACCEPTED }) { id }
		}`,
		{ c: E2E_PAPERS_CONFERENCE_ID }
	);
	expect(accepted.data?.papers ?? [], JSON.stringify(accepted)).toEqual([]);
});

test('a reader of the conference papers sees of a delegation only which role it holds', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.single));
	const id = E2E_PAPERS_AUTHOR_DELEGATION_ID;

	const delegation = await gql(
		page,
		`query ($id: ID!) { delegation(id: $id) { id assignedRole { id } members { id } } }`,
		{ id }
	);
	expect(delegation.errors, JSON.stringify(delegation)).toBeUndefined();
	expect(delegation.data?.delegation).toMatchObject({ id, members: [] });

	// its join code and application stay masked
	for (const column of ['entryCode', 'applied', 'memberCount']) {
		const masked = await gql(page, `query ($id: ID!) { delegation(id: $id) { id ${column} } }`, {
			id
		});
		expect(masked.data?.delegation ?? null, JSON.stringify(masked)).toBeNull();
	}
});

test('the delegation and its supervisors keep what they read of their own papers', async ({
	page
}) => {
	// Mia Mate did not write the paper, but it is her delegation's: every submitted version, and
	// the status. The reviews are the author's and the paper team's.
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.mate));
	const result = await gql(
		page,
		`query ($id: ID!) {
			paper(id: $id) { id status versions(orderBy: { version: asc }) { id status reviews { id } } }
		}`,
		{ id: E2E_PAPERS_SUBMITTED_PAPER_ID }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	expect(result.data?.paper).toEqual({
		id: E2E_PAPERS_SUBMITTED_PAPER_ID,
		status: 'ACCEPTED',
		versions: [
			{ id: E2E_PAPERS_VERSION_IDS.returned, status: 'CHANGES_REQUESTED', reviews: [] },
			{ id: E2E_PAPERS_VERSION_IDS.accepted, status: 'ACCEPTED', reviews: [] }
		]
	});
	expect(await viewedPaper(page, E2E_PAPERS_DRAFT_PAPER_ID)).toBeNull();
});

test('the author still reads every version of their paper, with its reviews', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.author));
	const result = await gql(
		page,
		`query ($id: ID!) {
			paper(id: $id) { status versions(orderBy: { version: asc }) { id reviews { id } } }
		}`,
		{ id: E2E_PAPERS_SUBMITTED_PAPER_ID }
	);
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	const paper = result.data?.paper as { versions: { id: string; reviews: unknown[] }[] };
	expect(paper.versions.map((version) => [version.id, version.reviews.length])).toEqual([
		[E2E_PAPERS_VERSION_IDS.returned, 1],
		[E2E_PAPERS_VERSION_IDS.accepted, 1],
		[E2E_PAPERS_VERSION_IDS.unsubmitted, 0]
	]);
	expect(await viewedPaper(page, E2E_PAPERS_DRAFT_PAPER_ID)).not.toBeNull();
});

test('a participant without a seat reads no paper of the conference', async ({ page }) => {
	// Registered, so the list answers; but without a role there is nothing in it.
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.unseated));
	expect(await conferencePapers(page)).toEqual([]);
	expect(await viewedPaper(page, E2E_PAPERS_SUBMITTED_PAPER_ID)).toBeNull();
});

test('somebody outside the conference reads none of its papers', async ({ page }) => {
	await loginAs(page, makeTestUser('papers-outsider'));

	const list = await gql(
		page,
		`query ($c: ID!) { findPapersGroupedByCommittee(conferenceId: $c) { agendaItems { papers { id } } } }`,
		{ c: E2E_PAPERS_CONFERENCE_ID }
	);
	expect(list.errors?.[0]?.extensions?.code, JSON.stringify(list)).toBe('FORBIDDEN');
	expect(await viewedPaper(page, E2E_PAPERS_SUBMITTED_PAPER_ID)).toBeNull();

	const papers = await gql(
		page,
		`query ($c: ID!) { papers(where: { conference: { id: { eq: $c } } }) { id } }`,
		{ c: E2E_PAPERS_CONFERENCE_ID }
	);
	expect(papers.data?.papers ?? [], JSON.stringify(papers)).toEqual([]);

	const delegation = await gql(page, `query ($id: ID!) { delegation(id: $id) { id } }`, {
		id: E2E_PAPERS_AUTHOR_DELEGATION_ID
	});
	expect(delegation.data?.delegation ?? null, JSON.stringify(delegation)).toBeNull();
});

test('until the assignment is released, a paper stays with its delegation', async ({ page }) => {
	// Dana holds a seat in the unreleased conference too, where Germany handed in a paper: it
	// would tell her which delegation holds which role.
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.delegate));
	expect(await conferencePapers(page, E2E_PAPERS_UNRELEASED_CONFERENCE_ID)).toEqual([]);
	expect(await viewedPaper(page, E2E_PAPERS_UNRELEASED_PAPER_ID)).toBeNull();
});

test('the conference papers open a submitted paper read-only', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_PAPERS_PEOPLE.single));
	await page.goto(`/dashboard/${E2E_PAPERS_CONFERENCE_ID}/paperhub`);

	// a single participant has only this view: the committee with Germany's paper in it
	const committee = page.locator('section', { hasText: 'Generalversammlung' });
	await expect(committee).toBeVisible();
	await committee.getByRole('link').first().click();

	await expect(page).toHaveURL(new RegExp(`paperhub/view/${E2E_PAPERS_SUBMITTED_PAPER_ID}`));
	await expect(page.getByText('Du siehst dieses Papier im Lesemodus')).toBeVisible();
	await expect(page.getByText(E2E_PAPERS_ACCEPTED_TEXT)).toBeVisible();
});
