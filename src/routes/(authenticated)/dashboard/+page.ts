import { redirect } from '@sveltejs/kit';
import type { PageLoad } from './$types';
import { graphql } from '$houdini';

const myConferences = graphql(`
	query MyConferencesQuery($userId: String!, $now: DateTime!) {
		findManyConferences(
			where: {
				OR: [
					{ conferenceSupervisors: { some: { userId: { equals: $userId } } } }
					{ delegationMembers: { some: { userId: { equals: $userId } } } }
					{ singleParticipants: { some: { userId: { equals: $userId } } } }
				]
				AND: [{ startConference: { lt: $now } }]
			}
		) {
			id
			title
			location
			website
			longTitle
			language
			imageDataURL
			startRegistration
			startAssignment
			startConference
			endConference
		}
	}
`);

export const load: PageLoad = async (event) => {
	const data = await event.parent();
	const conferencesQuery = await myConferences.fetch({
		variables: { userId: data.user.sub, now: new Date(Date.now()) },
		event,
		blocking: true
	});
	const conferences = conferencesQuery.data?.findManyConferences ?? [];

	if (conferences.length === 1) {
		redirect(303, `/dashboard/${conferences[0].id}`);
	}

	return {
		conferences
	};
};
