import type { Page } from '@playwright/test';

/**
 * The id of a conference's role for a nation, as the API names it. Roles are public; their ids
 * depend on how the role came to be (the seed, a migration, the seat planning), so specs ask.
 */
export async function nationRoleId(page: Page, conferenceId: string, alpha3Code: string) {
	const res = await page.request.post('/api/graphql', {
		data: {
			query: `query ($c: ID!, $n: String!) {
				conferenceRoles(where: { conferenceId: { eq: $c }, nationAlpha3Code: { eq: $n } }) { id }
			}`,
			variables: { c: conferenceId, n: alpha3Code }
		}
	});
	const json: { data?: { conferenceRoles?: { id: string }[] } } = await res.json();
	const id = json.data?.conferenceRoles?.[0]?.id;
	if (!id) throw new Error(`no role for ${alpha3Code} in ${conferenceId}: ${JSON.stringify(json)}`);
	return id;
}
