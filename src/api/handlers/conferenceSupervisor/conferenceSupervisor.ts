import { schoolNameSchema } from '#lib/schemata/schoolChoice';
import { db } from '#api/db/db';
import { object, query, schemaBuilder, type ApiContext } from '#api/rumble';
import {
	connectParticipantToSupervisor,
	disconnectParticipantFromSupervisor,
	findSupervisorByConnectionCode,
	previewSupervisorByCode,
	registerSupervisor,
	updateConferenceSupervisor
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
import { assertAllowed } from '#api/services/authHelper/utils';

registerConferenceSupervisorAbilities();

const ConferenceSupervisorRef = object({ table: 'conferenceSupervisor' });
query({ table: 'conferenceSupervisor' });

/** The supervisor `id` as far as the caller may read it, for a `drizzleField` to answer with. */
const readableSupervisor = async ({ ctx, id }: { ctx: ApiContext; id: string }) =>
	(await ctx.abilities.conferenceSupervisor.filter('read')).merge({ where: { id } }).query.single;

schemaBuilder.mutationFields((t) => ({
	createConferenceSupervisor: t.drizzleField({
		description:
			'Registers the caller as a supervisor of the conference, or, with `userId`, participant care registers someone else (in any stage). CONFLICT outside the registration window, or when the person takes part in the conference already or is on its team.',
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			userId: t.arg.id({
				description: 'Somebody else to register; left out registers the caller.'
			}),
			plansOwnAttendenceAtConference: t.arg.boolean({
				description: 'Whether they attend the conference themselves; true when left out.'
			}),
			schoolId: t.arg.id({
				description: "An existing school as the supervisor's own; neither school argument for none."
			}),
			schoolName: t.arg
				.string({
					description: 'The name of a school to find (ignoring case and spacing) or create.'
				})
				.validate(schoolNameSchema)
		},
		resolve: async (query, _root, args, ctx) => {
			const subject = await assertCanCreateConferenceSupervisor({
				ctx,
				conferenceId: args.conferenceId,
				subjectUserId: args.userId
			});
			const createdId = await registerSupervisor({
				conferenceId: args.conferenceId,
				...subject,
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
		description:
			'Changes whether the supervisor plans to attend the conference themselves: the supervisor, or participant care.',
		type: ConferenceSupervisorRef,
		args: {
			id: t.arg.id({ required: true }),
			plansOwnAttendenceAtConference: t.arg.boolean({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertAllowed({ ctx, table: 'conferenceSupervisor', action: 'update', id: args.id });
			await updateConferenceSupervisor({
				id: args.id,
				plansOwnAttendenceAtConference: args.plansOwnAttendenceAtConference
			});

			return db.query.conferenceSupervisor
				.findFirst(query(await readableSupervisor({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	connectToConferenceSupervisor: t.drizzleField({
		description:
			"Puts a delegate or single participant into a supervisor's care by the supervisor's connection code: the caller themselves, or, with `userId`, participant care someone else. A wrong code answers NOT_FOUND (ten in ten minutes: TOO_MANY_ATTEMPTS); a supervisor or team member cannot be supervised (CONFLICT).",
		type: ConferenceSupervisorRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			connectionCode: t.arg.string({ required: true }),
			userId: t.arg.id({
				description: 'Somebody else to connect; left out connects the caller.'
			})
		},
		resolve: async (query, _root, args, ctx) => {
			const { subjectId } = await assertCanConnectToConferenceSupervisor({
				ctx,
				conferenceId: args.conferenceId,
				subjectUserId: args.userId
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
		description:
			'Ends a supervision, so the supervisor no longer looks after the person: the person, the supervisor, or participant care.',
		type: 'Boolean',
		args: {
			supervisorId: t.arg.id({ required: true }),
			userId: t.arg.id({ required: true, description: 'The supervised person.' })
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
			'Gives the supervisor a new connection code: the supervisor, or participant care. The old one stops working; people already connected stay so.',
		type: ConferenceSupervisorRef,
		args: { id: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const supervisor = await assertCanRotateSupervisorConnectionCode({ ctx, id: args.id });
			await updateConferenceSupervisor({ id: supervisor.id, rotateConnectionCode: true });

			return db.query.conferenceSupervisor
				.findFirst(query(await readableSupervisor({ ctx, id: supervisor.id })))
				.then(assertFindFirstExists);
		}
	})
}));

const PreviewConferenceSupervisor = schemaBuilder.simpleObject('PreviewConferenceSupervisor', {
	description: 'What the connect form shows about the supervisor a connection code names.',
	fields: (t) => ({
		given_name: t.string({ nullable: true }),
		family_name: t.string({ nullable: true }),
		school_name: t.string({ nullable: true, description: "The supervisor's own school." }),
		school_city: t.string({ nullable: true }),
		different_school: t.boolean({
			description:
				"Whether the supervisor's school is another than the caller's own; false while either is unknown."
		})
	})
});

schemaBuilder.queryFields((t) => ({
	previewConferenceSupervisor: t.field({
		description:
			'Shows whose supervision a participant is about to accept, before they connect. Like `previewDelegation`, the connection code is the authorisation, but the caller has to take part in the conference already (FORBIDDEN otherwise), so an arbitrary signed-in user cannot probe codes. A wrong code answers NOT_FOUND (ten in ten minutes: TOO_MANY_ATTEMPTS).',
		type: PreviewConferenceSupervisor,
		args: {
			conferenceId: t.arg.id({ required: true }),
			connectionCode: t.arg.string({ required: true })
		},
		resolve: async (_root, args, ctx) => {
			const { callerId } = await assertCanPreviewConferenceSupervisor({
				ctx,
				conferenceId: args.conferenceId
			});

			return codeGuessLimiter.attempt({
				key: callerId,
				run: () =>
					previewSupervisorByCode({
						conferenceId: args.conferenceId,
						connectionCode: args.connectionCode,
						callerId
					})
			});
		}
	})
}));
