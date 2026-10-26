import { db, schema } from '#api/db/db.js';
import { scheduleEmailSweep } from '#api/handlers/email/emailSweep.js';
import { object, query, schemaBuilder } from '#api/rumble.js';
import { assertFindFirstExists } from '@m1212e/rumble';
import { NationRef } from '#api/handlers/nation/nation.js';
import { enum_ } from '#api/rumble.js';
import { eq, max } from 'drizzle-orm';
import { UserRef } from '#api/handlers/user/user.js';
import { loadSchoolRows } from '#api/handlers/schoolSuggestion/schoolSuggestions.js';
import { readableSchoolRegistrations } from '#api/handlers/schoolSuggestion/schoolSuggestionPermissions.js';
import {
	assertValidConferenceSettings,
	countOfferedSeats,
	countSeatedParticipants,
	findPlausibilityIssues,
	seedConference,
	updateConference,
	type PlausibilityUser
} from './conferenceService';
import {
	assertCanClaimConferenceFiles,
	assertCanReadPlausibility,
	assertCanSeedConference,
	assertCanUpdateConference,
	conferenceUpdateRefused,
	registerConferenceAbilities
} from './conferencePermissions';
import { committeePubsub, conferencePubsub, conferenceRolePubsub } from '#api/pubsub.js';

const ConferenceSchools = schemaBuilder.simpleObject('ConferenceSchools', {
	fields: (t) => ({
		schoolId: t.id(),
		/** The school's name */
		school: t.string(),
		delegationCount: t.int(),
		delegationMembers: t.int(),
		singleParticipants: t.int(),
		sumParticipants: t.int()
	})
});

registerConferenceAbilities();

const ConferenceRef = object({
	table: 'conference',
	adjust: (t) => ({
		/** Everyone who actually holds a seat - delegates of assigned delegations plus role holders. */
		totalParticipants: t.field({
			type: 'Int',
			resolve: (conference) => countSeatedParticipants(conference.id)
		}),

		/**
		 * Seats on offer: every nation of a committee is worth its `numOfSeatsPerDelegation`, every
		 * non-state actor its `seatAmount`.
		 */
		totalSeats: t.field({
			type: 'Int',
			resolve: (conference) => countOfferedSeats(conference.id)
		}),

		waitingListLength: t.field({
			type: 'Int',
			resolve: (conference) =>
				db.$count(schema.waitingListEntry, eq(schema.waitingListEntry.conferenceId, conference.id))
		}),

		/** The document number to hand to the next participant who needs one. */
		nextDocumentNumber: t.field({
			type: 'Int',
			resolve: async (conference) => {
				const [highest] = await db
					.select({ max: max(schema.conferenceParticipant.assignedDocumentNumber) })
					.from(schema.conferenceParticipant)
					.where(eq(schema.conferenceParticipant.conferenceId, conference.id));

				return (highest?.max ?? 0) + 1;
			}
		}),

		/**
		 * Applied registrations grouped by the school they named, which is how the organizers see
		 * which schools are sending how many people.
		 */
		schools: t.field({
			type: [ConferenceSchools],
			resolve: async (conference, _args, ctx) =>
				loadSchoolRows(conference.id, await readableSchoolRegistrations(ctx, conference.id))
		})
	})
});

query({ table: 'conference' });

const conferenceStateEnum = enum_({ tsName: 'conferenceState' });

schemaBuilder.mutationFields((t) => ({
	updateConference: t.drizzleField({
		type: ConferenceRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			longTitle: t.arg.string(),
			location: t.arg.string(),
			language: t.arg.string(),
			website: t.arg.string(),
			info: t.arg.string(),
			showInfoExpanded: t.arg.boolean(),
			linkToPreparationGuide: t.arg.string(),
			linkToTeamWiki: t.arg.string(),
			linkToServicesPage: t.arg.string(),
			linkToPaperInbox: t.arg.string(),
			isOpenPaperSubmission: t.arg.boolean(),
			showCalendar: t.arg.boolean(),
			timezone: t.arg.string(),
			nametagBinCount: t.arg.int(),
			/** How many seats one school may be given before the assignment warns; null for no limit. */
			maxSeatsPerSchool: t.arg.int(),
			state: t.arg({ type: conferenceStateEnum }),
			startAssignment: t.arg({ type: 'DateTime' }),
			startConference: t.arg({ type: 'DateTime' }),
			endConference: t.arg({ type: 'DateTime' }),
			registrationDeadlineGracePeriodMinutes: t.arg.int(),
			unlockPayments: t.arg.boolean(),
			unlockPostals: t.arg.boolean(),
			feeAmount: t.arg.float(),
			accountHolder: t.arg.string(),
			iban: t.arg.string(),
			bic: t.arg.string(),
			bankName: t.arg.string(),
			currency: t.arg.string(),
			postalName: t.arg.string(),
			postalStreet: t.arg.string(),
			postalApartment: t.arg.string(),
			postalZip: t.arg.string(),
			postalCity: t.arg.string(),
			postalCountry: t.arg.string(),
			// Files uploaded through `requestFileUpload` for this conference; null removes one.
			imageFileId: t.arg.id(),
			emblemFileId: t.arg.id(),
			logoFileId: t.arg.id(),
			contractFileId: t.arg.id(),
			guardianConsentFileId: t.arg.id(),
			mediaConsentFileId: t.arg.id(),
			termsAndConditionsFileId: t.arg.id(),
			certificateFileId: t.arg.id()
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateConference(ctx, args);
			assertValidConferenceSettings(args);
			await assertCanClaimConferenceFiles(ctx, args);
			// Nothing matches when the conference is gone.
			if (!(await updateConference(args))) throw conferenceUpdateRefused();

			conferencePubsub.updated(args.id);
			// unlocking postals or payments, or the state, may owe mails
			scheduleEmailSweep(args.id, ctx.requestUrl().origin);

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	}),

	/**
	 * Creates a whole conference - committees, non-state actors and custom roles - from a seeding
	 * document. Admin only.
	 */
	seedNewConference: t.drizzleField({
		type: ConferenceRef,
		args: { data: t.arg({ type: 'JSON', required: true }) },
		resolve: async (query, _root, args, ctx) => {
			assertCanSeedConference(ctx);
			const created = await seedConference(args.data);

			conferencePubsub.created();
			committeePubsub.created();
			conferenceRolePubsub.created();

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({ where: { id: created.id } })
							.query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	/** Every nation seated in any of a conference's committees, each once. */
	getAllConferenceNations: t.drizzleField({
		type: [NationRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await db.query.conference
				.findFirst({
					...(await ctx.abilities.conference.filter('read')).merge({
						where: { id: args.conferenceId }
					}).query.single,
					columns: { id: true }
				})
				.then(assertFindFirstExists);

			return db.query.nation.findMany(
				query({
					where: { conferenceRoles: { conferenceId: args.conferenceId, committees: true } }
				})
			);
		}
	})
}));

const PlausibilityResult = schemaBuilder
	.objectRef<{
		tooYoungUsers: PlausibilityUser[];
		tooOldUsers: PlausibilityUser[];
		shouldBeSupervisor: PlausibilityUser[];
		shouldNotBeSupervisor: PlausibilityUser[];
		dataMissing: PlausibilityUser[];
	}>('PlausibilityResult')
	.implement({
		fields: (t) => ({
			tooYoungUsers: t.field({ type: [UserRef], resolve: (parent) => parent.tooYoungUsers }),
			tooOldUsers: t.field({ type: [UserRef], resolve: (parent) => parent.tooOldUsers }),
			shouldBeSupervisor: t.field({
				type: [UserRef],
				resolve: (parent) => parent.shouldBeSupervisor
			}),
			shouldNotBeSupervisor: t.field({
				type: [UserRef],
				resolve: (parent) => parent.shouldNotBeSupervisor
			}),
			dataMissing: t.field({ type: [UserRef], resolve: (parent) => parent.dataMissing })
		})
	});

schemaBuilder.queryFields((t) => ({
	/**
	 * Flags participants whose age does not fit the role they registered for, plus those whose
	 * account data no longer satisfies the registration form. Purely advisory - nothing here
	 * blocks a registration, it only gives the organizers a list to look at.
	 */
	conferencePlausibility: t.field({
		type: PlausibilityResult,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadPlausibility(ctx, args.conferenceId);
			return findPlausibilityIssues(args.conferenceId, await ctx.abilities.user.filter('read'));
		}
	})
}));
