import type { Page } from '@playwright/test';
import { test, expect } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import { TEAM_OVERVIEW } from '../seed/teamOverview';

// The figures the team overview's widgets added to the API: the entrance today and the
// certificates for participant care only, and how many have not answered a survey only for those
// who manage the participants (null for anybody else reading the question).

interface GraphQLResult {
	data?: Record<string, unknown> | null;
	errors?: { message: string }[];
}

async function gql(page: Page, query: string, variables: Record<string, unknown> = {}) {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: { query, variables }
	});
	return (await res.json()) as GraphQLResult;
}

const ENTRANCE = `query ($id: ID!, $since: DateTime!) {
	entranceSummary(conferenceId: $id, since: $since) { expected checkedIn minorsWithoutConsent }
}`;
const CERTIFICATES = `query ($id: ID!) { certificateHoldersCount(conferenceId: $id) }`;
const SURVEYS = `query ($id: ID!) {
	surveyQuestions(where: { conferenceId: { eq: $id } }) { id unansweredCount }
}`;

const startOfToday = () => {
	const now = new Date();
	return new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
};

test('participant care reads the entrance, the certificates and the open answers', async ({
	page
}) => {
	await loginAs(page, fixedTestUser(TEAM_OVERVIEW.careId));

	const entrance = await gql(page, ENTRANCE, { id: TEAM_OVERVIEW.activeId, since: startOfToday() });
	expect(entrance.data?.entranceSummary, JSON.stringify(entrance)).toEqual({
		expected: 2,
		checkedIn: 1,
		minorsWithoutConsent: 1
	});

	const certificates = await gql(page, CERTIFICATES, { id: TEAM_OVERVIEW.postId });
	expect(certificates.data?.certificateHoldersCount, JSON.stringify(certificates)).toBe(1);

	const surveys = await gql(page, SURVEYS, { id: TEAM_OVERVIEW.preparationId });
	expect(surveys.data?.surveyQuestions, JSON.stringify(surveys)).toEqual([
		{ id: TEAM_OVERVIEW.surveyId, unansweredCount: 1 }
	]);
});

test('a reviewer reads neither the entrance nor the certificates', async ({ page }) => {
	await loginAs(page, fixedTestUser(TEAM_OVERVIEW.reviewerId));

	const entrance = await gql(page, ENTRANCE, { id: TEAM_OVERVIEW.activeId, since: startOfToday() });
	expect(entrance.errors?.[0]?.message, JSON.stringify(entrance)).toMatch(/Access denied/);

	const certificates = await gql(page, CERTIFICATES, { id: TEAM_OVERVIEW.postId });
	expect(certificates.errors?.[0]?.message, JSON.stringify(certificates)).toMatch(/Access denied/);
});

test('a participant reads the survey, but not how many have not answered', async ({ page }) => {
	await loginAs(page, fixedTestUser('e2e-ovw-delegate'));

	const surveys = await gql(page, SURVEYS, { id: TEAM_OVERVIEW.preparationId });
	expect(surveys.data?.surveyQuestions, JSON.stringify(surveys)).toEqual([
		{ id: TEAM_OVERVIEW.surveyId, unansweredCount: null }
	]);
});
