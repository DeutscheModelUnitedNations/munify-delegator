import { graphql } from '$houdini';
import { allConferenceQuery } from '$lib/queries/allConferences';
import { error } from '@sveltejs/kit';
import type { LayoutLoad } from './$types';
import { m } from '$lib/paraglide/messages';

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
			orderBy: { startConference: desc }
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

export const load: LayoutLoad = async (event) => {
	const { user } = await event.parent();

	// we want the conferences to appear either if we are a privileged user on that conference or
	// if we are a system admin
	if (user.myOIDCRoles.includes('admin')) {
		// in case we are an admin => display all conferences
		const { data } = await allConferenceQuery.fetch({ event, blocking: true });
		const queriedConfernces = data?.findManyConferences;
		return {
			conferences: queriedConfernces?.map((c) => ({
				id: c.id,
				title: c.title,
				myMembership: 'SYSTEM_ADMIN'
			}))
		};
	}

	// in case we are a privileged user => display all conferences where thats the case
	const { data } = await conferencesWhereImMoreThanMember.fetch({
		event,
		variables: { myUserId: user.sub },
		blocking: true
	});
	const queriedConfernces = data?.findManyConferences;

	if (queriedConfernces.length === 0) {
		error(403, m.noAccess());
	}

	return {
		conferences: queriedConfernces?.map((c) => ({
			id: c.id,
			title: c.title,
			myMembership: c.teamMembers.find((m) => m.user.id === user.sub)?.role
		}))
	};
};
