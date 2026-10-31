import { applicationFormSchema } from '#lib/schemata/applicationForm';
import { db } from '#api/db/db';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';
import { object, query, schemaBuilder } from '#api/rumble';
import { applicationArgs } from '#api/handlers/delegation/applicationArgs';
import {
	createAssignedSingleParticipant,
	ownRegistrationToEdit,
	registerSingleParticipant,
	updateSingleParticipantApplication
} from './singleParticipantService';
import {
	assertCanCreateAppliedSingleParticipant,
	assertCanUpdateSingleParticipant,
	assertCustomRolesOf,
	registerSingleParticipantAbilities
} from './singleParticipantPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { singleParticipantPubsub } from '#api/pubsub';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerSingleParticipantAbilities();

const SingleParticipantRef = object({ table: 'singleParticipant' });
query({ table: 'singleParticipant' });
schemaBuilder.mutationFields((t) => ({
	createSingleParticipant: t.drizzleField({
		description:
			'Registering as a single participant. If the user already has an entry for this conference the legacy resolver updated it instead of failing, so this does the same.',
		type: SingleParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true }),
			...applicationArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			const id = ctx.mustBeLoggedIn().sub;

			const existing = await ownRegistrationToEdit({ userId: id, args });
			await assertCustomRolesOf({ conferenceId: args.conferenceId, roleIds: [args.roleId] });
			const rowId = await registerSingleParticipant({ userId: id, args, existing });

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id: rowId } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			id: t.arg.id({ required: true }),
			experience: t.arg.string().validate(applicationFormSchema.shape.experience),
			motivation: t.arg.string().validate(applicationFormSchema.shape.motivation),
			applyForRolesIdList: t.arg.idList(),
			unApplyForRolesIdList: t.arg.idList(),
			applied: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateSingleParticipant({
				ctx,
				id: args.id,
				applyForRolesIdList: args.applyForRolesIdList ?? []
			});
			await updateSingleParticipantApplication(args);

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id: args.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	deleteSingleParticipant: t.field({
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'singleParticipant', id: args.id });
			singleParticipantPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	createAppliedSingleParticipant: t.drizzleField({
		description: 'Management assigning a user directly as a single participant with a role.',
		type: SingleParticipantRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAppliedSingleParticipant({
				ctx,
				conferenceId: args.conferenceId,
				roleId: args.roleId
			});

			const createdId = await createAssignedSingleParticipant(args);

			scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });

			return db.query.singleParticipant
				.findFirst(
					query(
						(await ctx.abilities.singleParticipant.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));
