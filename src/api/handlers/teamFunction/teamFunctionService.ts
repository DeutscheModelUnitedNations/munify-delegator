import { db, schema } from '#api/db/db';
import { teamFunctionPubsub, teamMemberPubsub } from '#api/pubsub';

type TeamFunctionKind = (typeof schema.teamFunctionKind.enumValues)[number];

/**
 * Gives a team member a function in a committee; one they already hold stays as it is. That the
 * committee is of the member's conference is the database's (`team_function_same_conference`).
 * Returns the function's id.
 */
export async function giveTeamFunction({
	teamMemberId,
	committeeId,
	kind
}: {
	teamMemberId: string;
	committeeId: string;
	kind: TeamFunctionKind;
}) {
	const [created] = await db
		.insert(schema.teamFunction)
		.values({ teamMemberId, committeeId, kind })
		.onConflictDoNothing()
		.returning({ id: schema.teamFunction.id });
	if (created) {
		teamFunctionPubsub.created();
		teamMemberPubsub.updated(teamMemberId);
		return created.id;
	}
	const held = await db.query.teamFunction.findFirst({
		where: { teamMemberId, committeeId, kind },
		columns: { id: true }
	});
	if (!held) throw new Error('giveTeamFunction: the function is neither new nor held');
	return held.id;
}
