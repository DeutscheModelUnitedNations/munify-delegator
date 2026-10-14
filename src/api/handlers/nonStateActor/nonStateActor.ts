import { db } from '$api/db/db';
import { object, query, schemaBuilder } from '$api/rumble';
import { nonStateActorUpdateData } from '$api/services/seatPlanning';
import { tidyRoleApplicationsForRoles } from '$api/services/registration/tidyRoleApplications';
import { assertFindFirstExists } from '@m1212e/rumble';
import { nonStateActorPubsub, roleApplicationPubsub } from '$api/pubsub';
import {
	assertCanCreateNonStateActor,
	assertCanDeleteNonStateActor,
	assertCanUpdateNonStateActor,
	registerNonStateActorAbilities
} from './nonStateActorPermissions';
import {
	createNonStateActor,
	deleteNonStateActor,
	updateNonStateActor
} from './nonStateActorService';

registerNonStateActorAbilities();

const NonStateActorRef = object({ table: 'nonStateActor' });
query({ table: 'nonStateActor' });

schemaBuilder.mutationFields((t) => ({
	createNonStateActor: t.drizzleField({
		type: NonStateActorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			abbreviation: t.arg.string({ required: true }),
			description: t.arg.string({ required: true }),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateNonStateActor(ctx, args.conferenceId);
			const createdId = await createNonStateActor(args);

			nonStateActorPubsub.created();

			return db.query.nonStateActor
				.findFirst(
					query(
						(await ctx.abilities.nonStateActor.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateNonStateActor: t.drizzleField({
		type: NonStateActorRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			abbreviation: t.arg.string(),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int()
		},
		resolve: async (query, _root, args, ctx) => {
			const data = nonStateActorUpdateData(args);
			const before = await assertCanUpdateNonStateActor(ctx, args.id);
			await updateNonStateActor(args.id, data);

			nonStateActorPubsub.updated(args.id);

			// lowering the seats is allowed, but applications that no longer fit are dropped
			if ((args.seatAmount ?? before.seatAmount) < before.seatAmount) {
				await tidyRoleApplicationsForRoles(before.conferenceId, { nonStateActorIds: [before.id] });
				roleApplicationPubsub.removed();
			}

			return db.query.nonStateActor
				.findFirst(
					query(
						(await ctx.abilities.nonStateActor.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteNonStateActor: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteNonStateActor(ctx, args.id);
			await deleteNonStateActor(args.id);

			nonStateActorPubsub.removed();
			roleApplicationPubsub.removed();

			return true;
		}
	})
}));
