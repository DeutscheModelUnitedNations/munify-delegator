import { db, schema } from '$api/db/db';
import { abilityBuilder, object, countQuery, query, schemaBuilder } from '$api/rumble';
import {
	PARTICIPANT_CARE_ROLES,
	assertTeamRole,
	isOwnUser,
	isTeamMemberOfConference,
	systemAdmin,
	userId,
	where
} from '$api/services/authHelper';
import {
	connectParticipantToSupervisor,
	previewSupervisorByCode,
	registerSupervisor
} from './conferenceSupervisorService';
import { assertFindFirstExists } from '@m1212e/rumble';
import { makeEntryCode } from '$api/services/registration/entryCodeGenerator';
import { eq } from 'drizzle-orm';
import {
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	singleParticipantPubsub
} from '$api/pubsub';
import { m } from '$lib/paraglide/messages';
import { apiError } from '$api/services/apiError';

// Ported from abilities/entities/conferenceSupervisor.ts
abilityBuilder.conferenceSupervisor.allow(['read', 'update', 'delete']).when(systemAdmin);

// Participant care and project management manage their conference's supervisors.
abilityBuilder.conferenceSupervisor
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isTeamMemberOfConference(ctx, PARTICIPANT_CARE_ROLES)));

/**
 * Whoever holds a supervisor's connection code can attach themselves to that supervisor, so it is
 * the supervisor's to hand out: only they and participant care read it.
 */
const WITHOUT_CONNECTION_CODE = { connectionCode: false };

// Supervised participants see their own supervisors.
abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
	const id = userId(ctx);
	return id
		? {
				where: {
					OR: [
						{ supervisedDelegationMembers: { user: { id } } },
						{ supervisedSingleParticipants: { user: { id } } }
					]
				},
				columns: WITHOUT_CONNECTION_CODE
			}
		: undefined;
});

// Supervisors manage their own entry.
abilityBuilder.conferenceSupervisor
	.allow(['read', 'update', 'delete'])
	.when((ctx) => where(isOwnUser(ctx)));

// Supervisors see the other supervisors of the participants they share - the group payment page
// splits a fee between them.
abilityBuilder.conferenceSupervisor.allow('read').when((ctx) => {
	const id = userId(ctx);
	if (!id) return undefined;
	const supervisedByMe = { supervisors: { user: { id } } };
	return {
		where: {
			OR: [
				{ supervisedDelegationMembers: supervisedByMe },
				{ supervisedSingleParticipants: supervisedByMe }
			]
		},
		columns: WITHOUT_CONNECTION_CODE
	};
});

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
			plansOwnAttendenceAtConference: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			const callerId = userId(ctx);
			if (!callerId) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}
			const subjectId = args.userId ?? callerId;

			// Assigning somebody else needs participant care, project management or admin. Registering
			// yourself does not - which is why the check is gated on `args.userId` being present.
			if (args.userId && args.userId !== callerId) {
				await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			}

			const createdId = await registerSupervisor({
				conferenceId: args.conferenceId,
				subjectId,
				plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference
			});

			conferenceSupervisorPubsub.created();

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
			plansOwnAttendenceAtConference: t.arg.boolean()
		},
		resolve: async (query, _root, args, ctx) => {
			await db
				.update(schema.conferenceSupervisor)
				.set({ plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference ?? undefined })
				.where(
					(await ctx.abilities.conferenceSupervisor.filter('update')).merge({
						where: { id: args.id }
					}).sql.where
				);

			conferenceSupervisorPubsub.updated(args.id);

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
			const callerId = userId(ctx);
			if (!callerId) {
				throw apiError('UNAUTHENTICATED', m.mustBeLoggedIn());
			}
			const subjectId = args.userId ?? callerId;
			// Connecting somebody else is participant care's job (the user card's supervisor modal);
			// the code alone only lets a participant attach themselves.
			if (subjectId !== callerId) {
				await assertTeamRole(ctx, args.conferenceId, PARTICIPANT_CARE_ROLES);
			}

			const linked = await connectParticipantToSupervisor(
				args.conferenceId,
				args.connectionCode,
				subjectId
			);

			// Nothing on the supervisor row itself changed, but who it supervises did.
			conferenceSupervisorPubsub.updated(linked.supervisorId);
			if (linked.delegationMemberId) {
				delegationMemberPubsub.updated(linked.delegationMemberId);
			}
			if (linked.singleParticipantId) {
				singleParticipantPubsub.updated(linked.singleParticipantId);
			}

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
			// The supervisor themselves, participant care and project management, and admins: the
			// row's update ability.
			const supervisor = await db.query.conferenceSupervisor.findFirst({
				...(await ctx.abilities.conferenceSupervisor.filter('update')).merge({
					where: { id: args.id }
				}).query.single,
				columns: { id: true }
			});
			if (!supervisor) {
				throw apiError('FORBIDDEN', m.supervisorRotateForbidden());
			}

			await db
				.update(schema.conferenceSupervisor)
				.set({ connectionCode: makeEntryCode() })
				.where(eq(schema.conferenceSupervisor.id, supervisor.id));

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
			const caller = ctx.mustBeLoggedIn();

			return previewSupervisorByCode(args.conferenceId, args.connectionCode, caller.sub);
		}
	})
}));
