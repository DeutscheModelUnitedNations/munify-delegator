import { client } from '#lib/api/rumbleClient/client';
import { fetchTeamAccess } from '#lib/api/teamAccess';
import { canManageParticipants } from '#lib/helpers/teamAccess';
import { inboxesOf } from './teamInboxes';

/**
 * What says which team inboxes the caller answers in a conference: their team roles, their
 * functions and the conference's committees. The team menu and the messages page both ask, and
 * read it with `teamInboxesOf` in a derived of their own, so they follow a function handed out
 * while they are open.
 */
export function fetchTeamInboxes({
	conferenceId,
	userId
}: {
	conferenceId: string;
	userId: string;
}) {
	return Promise.all([
		fetchTeamAccess(conferenceId),
		client.liveQuery.teamFunctions({
			__args: {
				where: { teamMember: { userId: { eq: userId }, conferenceId: { eq: conferenceId } } }
			},
			kind: true,
			committeeId: true,
			committee: { abbreviation: true }
		}),
		client.liveQuery.committees({
			__args: { where: { conferenceId: { eq: conferenceId } } },
			abbreviation: true
		})
	]);
}

/** The inboxes those answers add up to, and whether the caller is participant care (the reports). */
export function teamInboxesOf([access, functions, committees]: Awaited<
	ReturnType<typeof fetchTeamInboxes>
>) {
	const cares = canManageParticipants(access);
	return {
		cares,
		inboxes: inboxesOf({ cares, functions, isAdmin: access.isAdmin, committees })
	};
}
