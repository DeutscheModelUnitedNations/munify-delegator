import { test, expect, type Page } from '../support/test';
import { fixedTestUser, loginAs } from '../support/auth';
import {
	E2E_NUMBERS_CARE_ID,
	E2E_NUMBERS_CONFERENCE_ID,
	E2E_NUMBERS_USER_IDS
} from '../seed/documentNumbers';

// Document numbers are handed out one at a time: several people of participant care working through
// letters at once get different ones, a person keeps theirs when the next one is asked for again,
// and a number somebody else has is refused.

type Result = {
	data?: { upsertConferenceParticipant?: { assignedDocumentNumber: number | null } | null } | null;
	errors?: { message: string; extensions?: { code?: string } }[];
};

async function assign({
	page,
	userId,
	...number
}: {
	page: Page;
	userId: string;
	next: boolean;
	given?: number;
}): Promise<Result> {
	const res = await page.request.post('/api/graphql', {
		headers: { 'x-locale': 'en' },
		data: {
			query: `mutation ($c: ID!, $u: ID!, $given: Int, $next: Boolean) {
				upsertConferenceParticipant(
					conferenceId: $c, userId: $u,
					assignedDocumentNumber: $given, assignNextDocumentNumber: $next
				) { assignedDocumentNumber }
			}`,
			variables: { c: E2E_NUMBERS_CONFERENCE_ID, u: userId, ...number }
		}
	});
	return res.json();
}

const numberOf = (result: Result) => {
	expect(result.errors, JSON.stringify(result)).toBeUndefined();
	return result.data?.upsertConferenceParticipant?.assignedDocumentNumber;
};

test('document numbers are unique, kept, and refused when taken', async ({ page }) => {
	await loginAs(page, fixedTestUser(E2E_NUMBERS_CARE_ID), { startUrl: '/dashboard' });

	// all at once
	const results = await Promise.all(
		E2E_NUMBERS_USER_IDS.map((userId) => assign({ page, userId, next: true }))
	);
	const numbers = results.map(numberOf);
	expect(numbers.toSorted()).toEqual([1, 2, 3, 4, 5, 6]);

	// asked for again, also twice at once: the person keeps the number
	const [first, second] = E2E_NUMBERS_USER_IDS;
	const again = await Promise.all([
		assign({ page, userId: first, next: true }),
		assign({ page, userId: first, next: true })
	]);
	expect(again.map(numberOf)).toEqual([numbers[0], numbers[0]]);

	// somebody else's number
	const taken = await assign({ page, userId: first, next: false, given: numbers[1] ?? undefined });
	expect(taken.errors?.[0]?.extensions?.code, JSON.stringify(taken)).toBe('CONFLICT');
	expect(taken.errors?.[0]?.message).toMatch(/belongs to someone else/);

	// a free one, typed in, replaces it
	expect(numberOf(await assign({ page, userId: second, next: false, given: 40 }))).toBe(40);
});
