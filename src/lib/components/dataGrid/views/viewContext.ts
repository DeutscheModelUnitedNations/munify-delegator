import { fetchCurrentUser } from '#lib/api/currentUser';
import { fetchTeamAccess } from '#lib/api/teamAccess';
import { canManageTableViews } from '#lib/helpers/teamAccess';
import type { ViewRights } from '#lib/dataGrid/views';

/** Who is looking at a table's views, and what they may do with the shared ones. */
export async function fetchViewContext(conferenceId: string): Promise<{
	userId: string;
	rights: ViewRights;
}> {
	const [user, access] = await Promise.all([fetchCurrentUser(), fetchTeamAccess(conferenceId)]);
	return {
		userId: user.sub,
		rights: { manageShared: canManageTableViews(access), manageGlobal: access.isAdmin }
	};
}
