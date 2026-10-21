import { db } from '$api/db/db';
import { object, query, schemaBuilder } from '$api/rumble';
import { nonStateActorUpdateData } from '$api/services/seatPlanning';
import { assertFindFirstExists } from '@m1212e/rumble';
import { conferenceRolePubsub, roleApplicationPubsub, singleParticipantPubsub } from '$api/pubsub';
import {
	assertCanCreateCustomRole,
	assertCanDeleteCustomRole,
	assertCanUpdateCustomRole,
	assertCanCreateNonStateActor,
	assertCanDeleteNonStateActor,
	assertCanUpdateNonStateActor,
	registerConferenceRoleAbilities
} from './conferenceRolePermissions';
import {
	createCustomRole,
	createNonStateActor,
	deleteCustomRole,
	deleteNonStateActor,
	updateCustomRole,
	updateNonStateActor
} from './conferenceRoleService';

registerConferenceRoleAbilities();

const ConferenceRoleRef = object({ table: 'conferenceRole' });
query({ table: 'conferenceRole' });

schemaBuilder.mutationFields((t) => ({
	createNonStateActor: t.drizzleField({
		type: ConferenceRoleRef,
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

			conferenceRolePubsub.created();

			return db.query.conferenceRole
				.findFirst(
					query(
						(await ctx.abilities.conferenceRole.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateNonStateActor: t.drizzleField({
		type: ConferenceRoleRef,
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
			const { applicationsTidied } = await updateNonStateActor(before, data);

			conferenceRolePubsub.updated(args.id);
			if (applicationsTidied) roleApplicationPubsub.removed();

			return db.query.conferenceRole
				.findFirst(
					query(
						(await ctx.abilities.conferenceRole.filter('read')).merge({
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

			conferenceRolePubsub.removed();
			roleApplicationPubsub.removed();

			return true;
		}
	}),

	/** A custom role for single participants, such as the press, with how many it seats. */
	createCustomRole: t.drizzleField({
		type: ConferenceRoleRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			name: t.arg.string({ required: true }),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateCustomRole(ctx, args.conferenceId);
			const createdId = await createCustomRole(args);

			conferenceRolePubsub.created();

			return db.query.conferenceRole
				.findFirst(
					query(
						(await ctx.abilities.conferenceRole.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateCustomRole: t.drizzleField({
		type: ConferenceRoleRef,
		args: {
			id: t.arg.id({ required: true }),
			name: t.arg.string(),
			description: t.arg.string(),
			fontAwesomeIcon: t.arg.string(),
			seatAmount: t.arg.int()
		},
		resolve: async (query, _root, { id, ...data }, ctx) => {
			await assertCanUpdateCustomRole(ctx, id);
			await updateCustomRole(id, data);

			conferenceRolePubsub.updated(id);

			return db.query.conferenceRole
				.findFirst(
					query(
						(await ctx.abilities.conferenceRole.filter('read')).merge({ where: { id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteCustomRole: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanDeleteCustomRole(ctx, args.id);
			await deleteCustomRole(args.id);

			conferenceRolePubsub.removed();
			singleParticipantPubsub.updated();

			return true;
		}
	})
}));
