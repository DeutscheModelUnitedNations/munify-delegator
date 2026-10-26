import { db, schema } from '$api/db/db';
import { scheduleEmailSweep } from '$api/handlers/email/emailSweep';
import { object, countQuery, query, schemaBuilder } from '$api/rumble';
import {
	createAssignedSingleParticipant,
	ownRegistrationToEdit,
	registerSingleParticipant,
	updateSingleParticipantApplication
} from './singleParticipantService';
import {
	assertCanCreateAppliedSingleParticipant,
	assertCanDeleteSingleParticipant,
	assertCanUpdateSingleParticipant,
	assertCustomRolesOf,
	registerSingleParticipantAbilities
} from './singleParticipantPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import { eq } from 'drizzle-orm';
import {
	conferenceParticipantPubsub,
	singleParticipantPubsub,
	waitingListEntryPubsub
} from '$api/pubsub';

registerSingleParticipantAbilities();

const SingleParticipantRef = object({ table: 'singleParticipant' });
query({ table: 'singleParticipant' });
countQuery({ table: 'singleParticipant' });
schemaBuilder.mutationFields((t) => ({
	/**
	 * Registering as a single participant. If the user already has an entry for this conference
	 * the legacy resolver updated it instead of failing, so this does the same.
	 */
	createSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true }),
			/** An existing school, or `schoolName` to find or create one; neither for no school. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string(),
			motivation: t.arg.string(),
			experience: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const id = ctx.mustBeLoggedIn().sub;

			const existing = await ownRegistrationToEdit(id, args);
			await assertCustomRolesOf(args.conferenceId, [args.roleId]);
			const rowId = await registerSingleParticipant(id, args, existing);

			singleParticipantPubsub.created();
			conferenceParticipantPubsub.updated();

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
			/** Both null removes the school; both left out keeps it. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string(),
			experience: t.arg.string(),
			motivation: t.arg.string(),
			applyForRolesIdList: t.arg.idList(),
			unApplyForRolesIdList: t.arg.idList(),
			applied: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateSingleParticipant(ctx, args.id, args.applyForRolesIdList ?? []);
			await updateSingleParticipantApplication(args);

			singleParticipantPubsub.updated(args.id);
			conferenceParticipantPubsub.updated();

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
			await assertCanDeleteSingleParticipant(ctx, args.id);
			await db.delete(schema.singleParticipant).where(eq(schema.singleParticipant.id, args.id));
			singleParticipantPubsub.removed();

			return true;
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/** Management assigning a user directly as a single participant with a role. */
	createAppliedSingleParticipant: t.drizzleField({
		type: SingleParticipantRef,
		args: {
			userId: t.arg.id({ required: true }),
			conferenceId: t.arg.id({ required: true }),
			roleId: t.arg.id({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanCreateAppliedSingleParticipant(ctx, args.conferenceId, args.roleId);

			const createdId = await createAssignedSingleParticipant(args);

			singleParticipantPubsub.created();
			waitingListEntryPubsub.updated();
			conferenceParticipantPubsub.updated();
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);

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
