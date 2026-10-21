import { db, schema } from '$api/db/db';
import { scheduleEmailSweep } from '$api/handlers/email/emailSweep';
import { object, countQuery, query, schemaBuilder } from '$api/rumble';
import {
	connectParticipantToSupervisor,
	findSupervisorByConnectionCode,
	previewSupervisorByCode,
	registerSupervisor,
	rotateConnectionCode
} from './conferenceSupervisorService';
import {
	assertCanBeSupervised,
	assertCanConnectToConferenceSupervisor,
	assertCanCreateConferenceSupervisor,
	assertCanPreviewConferenceSupervisor,
	assertCanRotateSupervisorConnectionCode,
	registerConferenceSupervisorAbilities,
	updatableConferenceSupervisor
} from './conferenceSupervisorPermissions';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	schoolPubsub,
	singleParticipantPubsub
} from '$api/pubsub';
import { resolveSchoolChoice } from '$api/handlers/school/schoolService';

registerConferenceSupervisorAbilities();

const ConferenceSupervisorRef = object({ table: 'conferenceSupervisor' });
query({ table: 'conferenceSupervisor' });
countQuery({ table: 'conferenceSupervisor' });
schemaBuilder.mutationFields((t) => ({
	createConferenceSupervisor: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Omitted when someone registers themselves; set when a team member assigns another user. */
			userId: t.arg.id(),
			plansOwnAttendenceAtConference: t.arg.boolean(),
			/** An existing school, or `schoolName` to find or create one; neither for no school. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const subjectId = args.userId ?? ctx.mustBeLoggedIn().sub;
			await assertCanCreateConferenceSupervisor(ctx, args.conferenceId, args.userId);

			const createdId = await registerSupervisor({
				conferenceId: args.conferenceId,
				subjectId,
				plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference,
				schoolId: args.schoolId,
				schoolName: args.schoolName
			});

			conferenceSupervisorPubsub.created();
			if (args.schoolName) schoolPubsub.created();

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: createdId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	updateConferenceSupervisor: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: {
			id: t.arg.id({ required: true }),
			plansOwnAttendenceAtConference: t.arg.boolean(),
			/** Both null removes the school; both left out keeps it. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string()
		},
		resolve: async (query, _root, args, ctx) => {
			const where = await updatableConferenceSupervisor(ctx, args.id);
			await db
				.update(schema.conferenceSupervisor)
				.set({
					plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? undefined,
					schoolId: await resolveSchoolChoice(args)
				})
				.where(where);

			conferenceSupervisorPubsub.updated(args.id);
			if (args.schoolName) schoolPubsub.created();

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: args.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** A participant attaches themselves to a supervisor using that supervisor's connection code. */
	connectToConferenceSupervisor: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			connectionCode: t.arg.string({ required: true }),
			userId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			const subjectId = args.userId ?? ctx.mustBeLoggedIn().sub;
			await assertCanConnectToConferenceSupervisor(ctx, args.conferenceId, subjectId);

			const supervisor = await findSupervisorByConnectionCode(
				args.conferenceId,
				args.connectionCode
			);
			const participation = await assertCanBeSupervised(args.conferenceId, subjectId);
			const linked = await connectParticipantToSupervisor(supervisor.id, participation);

			// Nothing on the supervisor row itself changed, but who it supervises did.
			conferenceSupervisorPubsub.updated(linked.supervisorId);
			if (linked.delegationMemberId) {
				delegationMemberPubsub.updated(linked.delegationMemberId);
			}
			if (linked.singleParticipantId) {
				singleParticipantPubsub.updated(linked.singleParticipantId);
			}
			scheduleEmailSweep(args.conferenceId, ctx.requestUrl().origin);

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: linked.supervisorId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	rotateSupervisorConnectionCode: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const supervisor = await assertCanRotateSupervisorConnectionCode(ctx, args.id);
			await rotateConnectionCode(supervisor.id);

			conferenceSupervisorPubsub.updated(supervisor.id);

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						(await ctx.abilities.conferenceSupervisor.filter('read')).merge({
							where: { id: supervisor.id }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

const PreviewConferenceSupervisor = schemaBuilder.simpleObject('PreviewConferenceSupervisor', {
	fields: (t) => ({
		given_name: t.string({ nullable: true }),
		family_name: t.string({ nullable: true })
	})
});

schemaBuilder.queryFields((t) => ({
	/**
	 * Shows whose supervision a participant is about to accept, before they connect.
	 *
	 * Like `previewDelegation`, the connection code is the authorisation - but this one also
	 * requires the caller to already take part in the conference in some role, so an arbitrary
	 * logged-in user cannot probe codes.
	 */
	previewConferenceSupervisor: t.field({
		type: PreviewConferenceSupervisor,
		args: {
			conferenceId: t.arg.id({ required: true }),
			connectionCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			await assertCanPreviewConferenceSupervisor(ctx, args.conferenceId);

			return previewSupervisorByCode(args.conferenceId, args.connectionCode);
		}
	})
}));
