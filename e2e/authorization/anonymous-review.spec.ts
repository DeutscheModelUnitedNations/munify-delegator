import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_AGENDA_ITEM_ID,
	E2E_PAPER_DELEGATE_USER_ID,
	E2E_PAPER_DELEGATION_ID,
	E2E_PAPER_REVIEWER_ID
} from '../seed/seed';

// A review published under a team name (`anonymousAs`) keeps its reviewer from the paper's
// author: the review's `reviewer` resolves to nothing for them, and filtering by `reviewerId`
// does not find it. The paper team still sees who wrote it.

type GraphQLResult = {
	data?: Record<string, unknown> | null;
	errors?: { message: string }[];
};

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const content = (text: string) => ({
	type: 'doc',
	content: [{ type: 'paragraph', content: [{ type: 'text', text }] }]
});

const CREATE_PAPER = `mutation ($delegationId: ID!, $agendaItemId: ID!, $content: JSON!) {
	createPaper(delegationId: $delegationId, agendaItemId: $agendaItemId, type: WORKING_PAPER, content: $content, status: SUBMITTED) { id }
}`;
const REVIEW = `mutation ($paperId: ID!, $comments: JSON!) {
	createPaperReview(paperId: $paperId, comments: $comments, newStatus: CHANGES_REQUESTED, anonymousAs: RESEARCH_SERVICE) { reviewId }
}`;
const HISTORY = `query ($id: ID!) {
	paper(id: $id) { versions { reviews { id anonymousAs reviewer { id givenName familyName } } } }
}`;
const BY_REVIEWER = `query ($id: ID!, $reviewerId: ID!) {
	paper(id: $id) { versions { reviews(where: { reviewerId: { eq: $reviewerId } }) { id anonymousAs reviewer { id } } } }
}`;

type History = {
	paper: {
		versions: {
			reviews: { id: string; anonymousAs: string | null; reviewer: { id: string } | null }[];
		}[];
	};
};
const reviewsOf = (result: GraphQLResult) => {
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	// TYPE-SAFETY-EXCEPTION: a raw GraphQL response, shaped by the query above
	return (result.data as unknown as History).paper.versions.flatMap((version) => version.reviews);
};

test('the author of an anonymously reviewed paper never learns who reviewed it', async ({
	browser
}) => {
	const author = await (await browser.newContext()).newPage();
	await loginAs(author, fixedTestUser(E2E_PAPER_DELEGATE_USER_ID));
	const created = await gql(author, CREATE_PAPER, {
		delegationId: E2E_PAPER_DELEGATION_ID,
		agendaItemId: E2E_AGENDA_ITEM_ID,
		content: content('E2E anonymous review paper.')
	});
	expect(created.errors, JSON.stringify(created)).toBeUndefined();
	const paperId = (created.data?.createPaper as { id: string }).id;

	const reviewer = await (await browser.newContext()).newPage();
	await loginAs(reviewer, fixedTestUser(E2E_PAPER_REVIEWER_ID));
	const reviewed = await gql(reviewer, REVIEW, { paperId, comments: content('Please revise.') });
	expect(reviewed.errors, JSON.stringify(reviewed)).toBeUndefined();
	const reviewId = (reviewed.data?.createPaperReview as { reviewId: string }).reviewId;

	// The team sees the reviewer and the name the review went out under.
	const teamView = reviewsOf(await gql(reviewer, HISTORY, { id: paperId }));
	expect(teamView.find((review) => review.id === reviewId)).toMatchObject({
		anonymousAs: 'RESEARCH_SERVICE',
		reviewer: { id: E2E_PAPER_REVIEWER_ID }
	});

	// The author reads the review, under the team name only.
	const authorView = reviewsOf(await gql(author, HISTORY, { id: paperId }));
	expect(authorView.find((review) => review.id === reviewId)).toEqual({
		id: reviewId,
		anonymousAs: 'RESEARCH_SERVICE',
		reviewer: null
	});

	const filtered = reviewsOf(
		await gql(author, BY_REVIEWER, { id: paperId, reviewerId: E2E_PAPER_REVIEWER_ID })
	);
	expect(filtered).toEqual([]);
});
