import { applicationFormSchema } from '#lib/schemata/applicationForm';
import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import { applicationArgs } from '#api/services/registration/applicationArgs';
import {
	createAssignedSingleParticipant,
	registerSingleParticipant,
	updateSingleParticipantApplication
} from './singleParticipantService';
import {
	assertCanCreateAppliedSingleParticipant,
	assertCanCreateSingleParticipant,
	assertCanUpdateSingleParticipant,
	registerSingleParticipantAbilities
} from './singleParticipantPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { singleParticipantPubsub } from '#api/pubsub';
import { deleteIfAllowed } from '#api/services/authHelper/utils';

registerSingleParticipantAbilities();

const SingleParticipantRef = object({ table: 'singleParticipant' });
query({ table: 'singleParticipant' });

/** The single participant `id` as far as the caller may read it, for a `drizzleField` to answer with. */
async function readableSingleParticipant({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.singleParticipant.filter('read')).merge({ where: { id } }).query
		.single;
}

schemaBuilder.mutationFields((t) => ({
	createSingleParticipant: t.drizzleField({
		description:
			'Registers the caller as a single participant applying for a custom role, with their own school. An existing registration in the conference that is not sent in yet is updated instead. CONFLICT outside the registration window (for a new one), when already sent in, or when the caller takes part in the conference otherwise.',
		type: SingleParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({
				required: true,
				description: 'A custom role of the conference to apply for.'
			}),
			...applicationArgs(t.arg)
		},
		resolve: async (query, _root, args, ctx) => {
			const { callerId } = await assertCanCreateSingleParticipant({
				ctx,
				conferenceId: args.conferenceId,
				roleId: args.roleId
			});
			const id = await registerSingleParticipant({ userId: callerId, args });

			return db.query.singleParticipant
				.findFirst(query(await readableSingleParticipant({ ctx, id })))
				.then(assertFindFirstExists);
		}
	}),

	updateSingleParticipant: t.drizzleField({
		description:
			"Changes a single participant's application in one go: the texts, the roles applied for and whether it is sent in; arguments left out stay as they are. Sending it in is refused with CONFLICT unless it has enough roles and both texts after this update, within the registration window.",
		type: SingleParticipantRef,
		args: {
			id: t.arg.id({ required: true }),
			experience: t.arg
				.string({ description: '`null` clears it.' })
				.validate(applicationFormSchema.shape.experience),
			motivation: t.arg
				.string({ description: '`null` clears it.' })
				.validate(applicationFormSchema.shape.motivation),
			applyForRolesIdList: t.arg.idList({
				description: 'Custom roles of the conference to add to the roles applied for.'
			}),
			unApplyForRolesIdList: t.arg.idList({
				description: 'Roles to take off the roles applied for.'
			}),
			applied: t.arg.boolean({
				description: 'Sends the application (true) or takes it back (false).'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateSingleParticipant({
				ctx,
				id: args.id,
				applyForRolesIdList: args.applyForRolesIdList ?? []
			});
			await updateSingleParticipantApplication(args);

			return db.query.singleParticipant
				.findFirst(query(await readableSingleParticipant({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	deleteSingleParticipant: t.field({
		description:
			"Withdraws a single participant's registration: the participant until it is sent in, participant care at any time.",
		type: 'Boolean',
		args: { id: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await deleteIfAllowed({ ctx, table: 'singleParticipant', id: args.id });
			singleParticipantPubsub.removed();

			return true;
		}
	}),

	createAppliedSingleParticipant: t.drizzleField({
		description:
			'Participant care placing a user straight into a custom role as a single participant, bypassing the application. A user who already takes part in the conference, or is on its team, is refused with CONFLICT.',
		type: SingleParticipantRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true, description: 'A custom role of the conference.' })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAppliedSingleParticipant({
				ctx,
				conferenceId: args.conferenceId,
				roleId: args.roleId
			});
			const id = await createAssignedSingleParticipant(args);

			return db.query.singleParticipant
				.findFirst(query(await readableSingleParticipant({ ctx, id })))
				.then(assertFindFirstExists);
		}
	})
}));
