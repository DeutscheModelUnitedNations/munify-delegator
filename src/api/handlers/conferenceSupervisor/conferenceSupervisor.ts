import { schoolNameSchema } from '#lib/schemata/schoolChoice';
import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
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
import { conferenceSupervisorPubsub } from '#api/pubsub';
import { assertAllowed, updateIfAllowed } from '#api/services/authHelper/utils';

registerConferenceSupervisorAbilities();

const ConferenceSupervisorRef = object({ table: 'conferenceSupervisor' });
query({ table: 'conferenceSupervisor' });
/** The supervisor with this id, as far as the caller may read it. */
const readableSupervisor = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.conferenceSupervisor.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createConferenceSupervisor: t.drizzleField({
		description:
			'Registers the caller as a supervisor of the conference, or, with `userId`, the team registers someone else.',
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			/** Omitted when someone registers themselves; set when a team member assigns another user. */
			userId: t.arg.id(),
			plansOwnAttendenceAtConference: t.arg.boolean(),
			/** An existing school, or `schoolName` to find or create one; neither for no school. */
			schoolId: t.arg.id(),
			schoolName: t.arg.string().validate(schoolNameSchema)
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

			return db.query.conferenceSupervisor
				.findFirst(query(await readableSupervisor({ ctx, id: createdId })))
				.then(assertFindFirstExists);
		}
	}),

	updateConferenceSupervisor: t.drizzleField({
		description: 'Changes whether the supervisor plans to attend the conference themselves.',
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
				.findFirst(query(await readableSupervisor({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	connectToConferenceSupervisor: t.drizzleField({
		description:
			"A participant attaches themselves to a supervisor using that supervisor's connection code.",
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
			await connectParticipantToSupervisor({ supervisorId: supervisor.id, participation });

			return db.query.conferenceSupervisor
				.findFirst(query(await readableSupervisor({ ctx, id: supervisor.id })))
				.then(assertFindFirstExists);
		}
	}),

	disconnectFromConferenceSupervisor: t.field({
		description: 'Ends a supervision: the supervisor no longer looks after the person.',
		type: 'Boolean',
		args: {
			supervisorId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const { conferenceId } = await assertCanDisconnectFromConferenceSupervisor({
				ctx,
				supervisorId: args.supervisorId,
				subjectId: args.userId
			});
			await disconnectParticipantFromSupervisor({
				supervisorId: args.supervisorId,
				conferenceId,
				subjectId: args.userId
			});
			return true;
		}
	}),

	rotateSupervisorConnectionCode: t.drizzleField({
		description:
			'Gives the supervisor a new connection code; the old one stops working, people already connected stay so.',
		type: ConferenceSupervisorRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const supervisor = await assertCanRotateSupervisorConnectionCode({ ctx, id: args.id });
			await rotateConnectionCode(supervisor.id);

			return db.query.conferenceSupervisor
				.findFirst(query(await readableSupervisor({ ctx, id: supervisor.id })))
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
		different_school: t.boolean({
			description: "Whether the supervisor's school is another than the caller's own."
		})
	})
});

schemaBuilder.queryFields((t) => ({
	previewConferenceSupervisor: t.field({
		description:
			'Shows whose supervision a participant is about to accept, before they connect. Like `previewDelegation`, the connection code is the authorisation - but this one also requires the caller to already take part in the conference in some role, so an arbitrary logged-in user cannot probe codes.',
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
