import { graphql } from '$houdini';
import { allConferenceQuery } from '$lib/queries/allConferences';
import type { PageLoad } from './$types';

const conferencesWhereImMoreThanMember = graphql(`
	query ConferencesWhereImMoreThanMember($myUserId: String!) {
		findManyConferences(
			where: {
				teamMembers: {
					some: {
						role: { in: [PROJECT_MANAGEMENT, PARTICIPANT_CARE] }
						userId: { equals: $myUserId }
					}
				}
			}
		) {
			id
			title
			teamMembers {
				id
				role
				user {
					id
				}
			}
		}
	}
`);

export const load: PageLoad = async (event) => {
	const { user } = await event.parent();

	// we want the conferences to appear either if we are a privileged user on that conference or
	// if we are a system admin
	if (user.myOIDCRoles.includes('admin')) {
		// in case we are an admin => display all conferences
		const { data } = await allConferenceQuery.fetch({ event });
		const queriedConfernces = data?.findManyConferences;
		return {
			conferences: queriedConfernces?.map((c) => ({
				id: c.id,
				title: c.title,
				myMembership: 'SYSTEM_ADMIN'
			}))
		};
	} else {
		// in case we are a privileged user => display all conferences where thats the case
		const { data } = await conferencesWhereImMoreThanMember.fetch({
			event,
			variables: { myUserId: user.sub }
		});
		const queriedConfernces = data?.findManyConferences;
		return {
			conferences: queriedConfernces?.map((c) => ({
				id: c.id,
				title: c.title,
				myMembership: c.teamMembers.find((m) => m.user.id === user.sub)?.role
			}))
		};
	}
};
