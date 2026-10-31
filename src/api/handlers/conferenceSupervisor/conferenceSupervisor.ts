import { db } from '#api/db/db';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep';
import { object, query, schemaBuilder } from '#api/rumble';
import {
	connectParticipantToSupervisor,
	disconnectParticipantFromSupervisor,
	findSupervisorByConnectionCode,
	previewSupervisorByCode,
	registerSupervisor,
	rotateConnectionCode
} from './conferenceSupervisorService';
import {
	assertCanBeSupervised,
	assertCanConnectToConferenceSupervisor,
	assertCanCreateConferenceSupervisor,
	assertCanDisconnectFromConferenceSupervisor,
	assertCanPreviewConferenceSupervisor,
	assertCanRotateSupervisorConnectionCode,
	registerConferenceSupervisorAbilities
} from './conferenceSupervisorPermissions';
import { codeGuessLimiter } from '#api/services/codeGuessLimit';
import { assertFindFirstExists } from '@m1212e/rumble';
import {
	conferenceParticipantPubsub,
	conferenceSupervisorPubsub,
	delegationMemberPubsub,
	schoolPubsub,
	singleParticipantPubsub
} from '#api/pubsub';
import { assertAllowed, queryAllowed, updateIfAllowed } from '#api/services/authHelper/utils';

registerConferenceSupervisorAbilities();

const ConferenceSupervisorRef = object({ table: 'conferenceSupervisor' });
query({ table: 'conferenceSupervisor' });
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
			await assertCanCreateConferenceSupervisor({
				ctx,
				conferenceId: args.conferenceId,
				subjectUserId: args.userId
			});

			const createdId = await registerSupervisor({
				conferenceId: args.conferenceId,
				subjectId,
				selfService: subjectId === ctx.mustBeLoggedIn().sub,
				plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference,
				schoolId: args.schoolId,
				schoolName: args.schoolName
			});

			conferenceSupervisorPubsub.created();
			conferenceParticipantPubsub.updated();
			if (args.schoolName) schoolPubsub.created();

			return db.query.conferenceSupervisor
				.findFirst(
					query(await queryAllowed({ ability: ctx.abilities.conferenceSupervisor, id: createdId }))
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
			if (typeof args.plansOwnAttendenceAtConference === 'boolean') {
				await updateIfAllowed({
					ctx,
					table: 'conferenceSupervisor',
					id: args.id,
					values: {
						plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference
					}
				});
			} else {
				await assertAllowed({ ctx, table: 'conferenceSupervisor', action: 'update', id: args.id });
			}

			conferenceSupervisorPubsub.updated(args.id);

			return db.query.conferenceSupervisor
				.findFirst(
					query(await queryAllowed({ ability: ctx.abilities.conferenceSupervisor, id: args.id }))
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
			await assertCanConnectToConferenceSupervisor({
				ctx,
				conferenceId: args.conferenceId,
				subjectId
			});

			const supervisor = await codeGuessLimiter.attempt({
				key: ctx.mustBeLoggedIn().sub,
				run: () =>
					findSupervisorByConnectionCode({
						conferenceId: args.conferenceId,
						connectionCode: args.connectionCode
					})
			});
			const participation = await assertCanBeSupervised({
				conferenceId: args.conferenceId,
				subjectId
			});
			const linked = await connectParticipantToSupervisor({
				supervisorId: supervisor.id,
				participation
			});

			// Nothing on the supervisor row itself changed, but who it supervises did.
			conferenceSupervisorPubsub.updated(linked.supervisorId);
			if (linked.delegationMemberId) {
				delegationMemberPubsub.updated(linked.delegationMemberId);
			}
			if (linked.singleParticipantId) {
				singleParticipantPubsub.updated(linked.singleParticipantId);
			}
			scheduleEmailSweep({ conferenceId: args.conferenceId, origin: ctx.requestUrl().origin });

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						await queryAllowed({
							ability: ctx.abilities.conferenceSupervisor,
							id: linked.supervisorId
						})
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/** Ends a supervision: the supervisor no longer looks after the person. */
	disconnectFromConferenceSupervisor: t.field({
		type: 'Boolean',
		args: {
			supervisorId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const conferenceId = await assertCanDisconnectFromConferenceSupervisor({
				ctx,
				supervisorId: args.supervisorId,
				subjectId: args.userId
			});
			const unlinked = await disconnectParticipantFromSupervisor({
				supervisorId: args.supervisorId,
				conferenceId,
				subjectId: args.userId
			});

			conferenceSupervisorPubsub.updated(args.supervisorId);
			if (unlinked) {
				conferenceParticipantPubsub.updated(unlinked.participantId);
				if (unlinked.delegationMemberId) {
					delegationMemberPubsub.updated(unlinked.delegationMemberId);
				}
				if (unlinked.singleParticipantId) {
					singleParticipantPubsub.updated(unlinked.singleParticipantId);
				}
			}
			return true;
		}
	}),

	rotateSupervisorConnectionCode: t.drizzleField({
		type: ConferenceSupervisorRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const supervisor = await assertCanRotateSupervisorConnectionCode({ ctx, id: args.id });
			await rotateConnectionCode(supervisor.id);

			conferenceSupervisorPubsub.updated(supervisor.id);

			return db.query.conferenceSupervisor
				.findFirst(
					query(
						await queryAllowed({ ability: ctx.abilities.conferenceSupervisor, id: supervisor.id })
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

const PreviewConferenceSupervisor = schemaBuilder.simpleObject('PreviewConferenceSupervisor', {
	fields: (t) => ({
		given_name: t.string({ nullable: true }),
		family_name: t.string({ nullable: true }),
		school_name: t.string({ nullable: true }),
		school_city: t.string({ nullable: true }),
		/** Whether the supervisor's school is another than the caller's own. */
		different_school: t.boolean()
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
			await assertCanPreviewConferenceSupervisor({ ctx, conferenceId: args.conferenceId });
			const caller = ctx.mustBeLoggedIn();

			return codeGuessLimiter.attempt({
				key: caller.sub,
				run: () =>
					previewSupervisorByCode({
						conferenceId: args.conferenceId,
						connectionCode: args.connectionCode,
						callerId: caller.sub
					})
			});
		}
	})
}));
