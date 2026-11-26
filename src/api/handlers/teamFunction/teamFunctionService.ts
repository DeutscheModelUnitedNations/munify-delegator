import { db, schema } from '#api/db/db';
import { apiError } from '#api/services/errors';
import { m } from '#lib/paraglide/messages';
import { functionFits } from '#lib/helpers/chat';
import { teamFunctionPubsub, teamMemberPubsub } from '#api/pubsub';

type TeamFunctionKind = (typeof schema.teamFunctionKind.enumValues)[number];

/**
 * Gives a team member a function, in a committee, for a custom role (`ROLE_SUPPORT`) or (a trusted
 * person) for the whole conference; one they already hold stays as it is. That the committee or
 * role is of the member's conference is the database's (`team_function_same_conference`), and that
 * the role is a custom one too (`team_function_role_kind`). Returns the function's id.
 */
export async function giveTeamFunction({
	teamMemberId,
	committeeId,
	roleId,
	kind
}: {
	teamMemberId: string;
	committeeId: string | null;
	roleId: string | null;
	kind: TeamFunctionKind;
}) {
	if (!functionFits({ kind, committeeId, roleId })) {
		throw apiError({ code: 'INVALID_INPUT', message: m.teamFunctionCommitteeMismatch() });
	}
	const [created] = await db
		.insert(schema.teamFunction)
		.values({ teamMemberId, committeeId, roleId, kind })
		.onConflictDoNothing()
		.returning({ id: schema.teamFunction.id });
	if (created) {
		teamFunctionPubsub.created();
		teamMemberPubsub.updated(teamMemberId);
		return created.id;
	}
	const held = await db.query.teamFunction.findFirst({
		where: {
			teamMemberId,
			kind,
			committeeId: committeeId ?? { isNull: true as const },
			roleId: roleId ?? { isNull: true as const }
		},
		columns: { id: true }
	});
	if (!held) throw new Error('giveTeamFunction: the function is neither new nor held');
	return held.id;
}
