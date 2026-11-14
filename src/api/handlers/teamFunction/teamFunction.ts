import { db } from '#api/db/db';
import { enum_, object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { deleteIfAllowed } from '#api/services/authHelper/utils';
import { teamFunctionPubsub } from '#api/pubsub';
import {
	assertCanGiveTeamFunction,
	registerTeamFunctionAbilities
} from './teamFunctionPermissions';
import { giveTeamFunction } from './teamFunctionService';

registerTeamFunctionAbilities();

const TeamFunctionRef = object({ table: 'teamFunction' });
const teamFunctionKindEnum = enum_({ tsName: 'teamFunctionKind' });
query({ table: 'teamFunction' });

schemaBuilder.mutationFields((t) => ({
	giveTeamFunction: t.drizzleField({
		description:
			"Gives a team member a function: `CHAIR` or `CONSULTANT` in a committee of their conference, or `TRUSTED_PERSON` for the whole conference (without a committee). Whoever holds a function answers its inbox in the chats: a committee's chairs or consultants theirs, the trusted persons their shared one and each their own. Project management and team coordinators only (FORBIDDEN otherwise); INVALID_INPUT for a committee of another conference, a committee function without a committee and a trusted person with one.",
		type: TeamFunctionRef,
		args: {
			teamMemberId: t.arg.id({ required: true }),
			committeeId: t.arg.id(),
			kind: t.arg({ type: teamFunctionKindEnum, required: true })
		},
		resolve: async (select, _root, args, ctx) => {
			await assertCanGiveTeamFunction({ ctx, teamMemberId: args.teamMemberId });
			const id = await giveTeamFunction({
				teamMemberId: args.teamMemberId,
				committeeId: args.committeeId ?? null,
				kind: args.kind
			});
			return db.query.teamFunction
				.findFirst(
					select(
						(await ctx.abilities.teamFunction.filter('read')).merge({ where: { id } }).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	removeTeamFunction: t.field({
		description:
			'Takes a function away from a team member. Project management and team coordinators only (NOT_FOUND otherwise).',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'teamFunction', id: args.id });
			teamFunctionPubsub.removed();
			return true;
		}
	})
}));
