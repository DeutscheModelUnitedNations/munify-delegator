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
			"Gives a team member a function in a committee of their conference: `CHAIR` or `CONSULTANT`. Whoever holds a function answers that committee's inbox of it in the chats. Project management and team coordinators only (FORBIDDEN otherwise); INVALID_INPUT for a committee of another conference.",
		type: TeamFunctionRef,
		args: {
			teamMemberId: t.arg.id({ required: true }),
			committeeId: t.arg.id({ required: true }),
			kind: t.arg({ type: teamFunctionKindEnum, required: true })
		},
		resolve: async (select, _root, args, ctx) => {
			await assertCanGiveTeamFunction({ ctx, teamMemberId: args.teamMemberId });
			const id = await giveTeamFunction(args);
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
			'Takes a committee function away from a team member. Project management and team coordinators only (NOT_FOUND otherwise).',
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'teamFunction', id: args.id });
			teamFunctionPubsub.removed();
			return true;
		}
	})
}));
