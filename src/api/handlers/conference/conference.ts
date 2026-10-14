import { db, schema } from '$api/db/db';
import { abilityBuilder, object, query, schemaBuilder } from '$api/rumble';
import {
	isParticipantOfConference,
	isTeamMemberOf,
	PROJECT_MANAGEMENT_ROLES,
	systemAdmin,
	where
} from '$api/services/authHelper';
import { assertFindFirstExists } from '@m1212e/rumble';
import { NationRef } from '$api/handlers/nation/nation';
import { enum_ } from '$api/rumble';
import { eq, max } from 'drizzle-orm';
import { UserRef } from '$api/handlers/user/user';
import { distinctNationCodes } from '$api/handlers/schoolSuggestion/conferenceAggregates';
import { loadSchoolRows } from '$api/handlers/schoolSuggestion/schoolSuggestions';
import { fileUrl } from '$api/services/files/storage';
import {
	countOfferedSeats,
	countSeatedParticipants,
	findPlausibilityIssues,
	mergeSchoolNames,
	seedConference,
	updateConference,
	type PlausibilityUser
} from './conferenceService';
import {
	committeePubsub,
	conferencePubsub,
	customConferenceRolePubsub,
	delegationPubsub,
	nonStateActorPubsub,
	schoolSuggestionPubsub,
	schoolSuggestionVariantPubsub,
	singleParticipantPubsub
} from '$api/pubsub';

const ConferenceSchools = schemaBuilder.simpleObject('ConferenceSchools', {
	fields: (t) => ({
		school: t.string(),
		delegationCount: t.int(),
		delegationMembers: t.int(),
		singleParticipants: t.int(),
		sumParticipants: t.int()
	})
});

/** Where the fee goes, where postal documents go, and the documents themselves. */
const MEMBERS_ONLY = {
	accountHolder: false,
	iban: false,
	bic: false,
	bankName: false,
	postalName: false,
	postalStreet: false,
	postalApartment: false,
	postalZip: false,
	postalCity: false,
	postalCountry: false,
	contractFileId: false,
	guardianConsentFileId: false,
	mediaConsentFileId: false,
	termsAndConditionsFileId: false,
	certificateFileId: false
};
/** The team's internal tools. */
const TEAM_ONLY = { linkToTeamWiki: false, linkToServicesPage: false };

// Everyone can see the conferences that are open for registration (or, from the assignment on,
// for the waiting list) and their details - short of the members-only and team-only columns. Any
// other conference is only visible to the people who have a part in it (the rules below).
abilityBuilder.conference.allow('read').when(() => ({
	where: { state: { in: ['PARTICIPANT_REGISTRATION', 'PREPARATION'] } },
	columns: { ...MEMBERS_ONLY, ...TEAM_ONLY }
}));
abilityBuilder.conference.allow('read').when(systemAdmin);

// Participants and supervisors also read the members-only columns.
abilityBuilder.conference.allow('read').when((ctx) => {
	const participant = isParticipantOfConference(ctx);
	return participant ? { where: participant.conference, columns: TEAM_ONLY } : undefined;
});

// The team reads all of it.
abilityBuilder.conference.allow('read').when((ctx) => where(isTeamMemberOf(ctx)));

// Update and delete are limited to the conference's own project management.
abilityBuilder.conference
	.allow(['update', 'delete'])
	.when((ctx) => where(isTeamMemberOf(ctx, PROJECT_MANAGEMENT_ROLES)));

const ConferenceRef = object({
	table: 'conference',
	adjust: (t) => ({
		// Whether each document template has been uploaded, for the configuration UI.
		contractContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.contractFileId
		}),
		guardianConsentContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.guardianConsentFileId
		}),
		mediaConsentContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.mediaConsentFileId
		}),
		termsAndConditionsContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.termsAndConditionsFileId
		}),
		certificateContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.certificateFileId
		}),

		// The uploaded images and templates, straight from the bucket; null when nothing is stored
		// (or the reader may not see it, since a masked file id reads as null).
		imageUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) => fileUrl('conference', 'image', conference.id, conference.imageFileId)
		}),
		emblemUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				fileUrl('conference', 'emblem', conference.id, conference.emblemFileId)
		}),
		logoUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) => fileUrl('conference', 'logo', conference.id, conference.logoFileId)
		}),
		contractContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				fileUrl('conference', 'contract', conference.id, conference.contractFileId)
		}),
		guardianConsentContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				fileUrl('conference', 'guardianConsent', conference.id, conference.guardianConsentFileId)
		}),
		mediaConsentContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				fileUrl('conference', 'mediaConsent', conference.id, conference.mediaConsentFileId)
		}),
		termsAndConditionsContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				fileUrl(
					'conference',
					'termsAndConditions',
					conference.id,
					conference.termsAndConditionsFileId
				)
		}),
		certificateContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				fileUrl('conference', 'certificate', conference.id, conference.certificateFileId)
		}),

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
					.select({ max: max(schema.conferenceParticipantStatus.assignedDocumentNumber) })
					.from(schema.conferenceParticipantStatus)
					.where(eq(schema.conferenceParticipantStatus.conferenceId, conference.id));

				return (highest?.max ?? 0) + 1;
			}
		}),

		/**
		 * Applied registrations grouped by the school they named, which is how the organizers see
		 * which schools are sending how many people.
		 */
		schools: t.field({
			type: [ConferenceSchools],
			resolve: async (conference, _args, ctx) => loadSchoolRows(conference.id, ctx)
		})
	})
});

query({ table: 'conference' });

schemaBuilder.mutationFields((t) => ({
	/**
	 * Merges several spellings of a school name into one, across both delegations and single
	 * participants. Participants type their school by hand, so the same institution arrives in
	 * a dozen variations; this is the cleanup tool for that.
	 */
	normalizeSchoolsInConference: t.drizzleField({
		type: ConferenceRef,
		args: {
			conferenceId: t.arg.id({ required: true }),
			schoolsToMerge: t.arg.stringList({ required: true }),
			newSchoolName: t.arg.string({ required: true })
		},
		resolve: async (query, _root, args, ctx) => {
			await mergeSchoolNames(ctx, args);

			delegationPubsub.updated();
			singleParticipantPubsub.updated();
			schoolSuggestionPubsub.updated();
			schoolSuggestionVariantPubsub.updated();

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({
							where: { id: args.conferenceId }
						}).query.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

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
			await updateConference(ctx, args);

			conferencePubsub.updated(args.id);

			return db.query.conference
				.findFirst(
					query(
						(await ctx.abilities.conference.filter('read')).merge({ where: { id: args.id } }).query
							.single
					)
				)
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.mutationFields((t) => ({
	/**
	 * Creates a whole conference - committees, non-state actors and custom roles - from a seeding
	 * document. Admin only.
	 */
	seedNewConference: t.drizzleField({
		type: ConferenceRef,
		args: { data: t.arg({ type: 'JSON', required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const created = await seedConference(ctx, args.data);

			conferencePubsub.created();
			committeePubsub.created();
			customConferenceRolePubsub.created();
			nonStateActorPubsub.created();

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
	/**
	 * Every nation seated in any of a conference's committees, deduplicated.
	 *
	 * A nation can sit in several committees, so the flattened list has repeats; dedup is by
	 * alpha-2 code, matching the legacy behaviour.
	 */
	getAllConferenceNations: t.drizzleField({
		type: [NationRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			const conference = await db.query.conference
				.findFirst({
					...(await ctx.abilities.conference.filter('read')).merge({
						where: { id: args.conferenceId }
					}).query.single,
					with: { committees: { with: { nations: true } } }
				})
				.then(assertFindFirstExists);

			const alpha3Codes = distinctNationCodes(conference.committees);
			if (alpha3Codes.length === 0) return [];

			// Re-queried through `query()` so the caller's field selection is honoured.
			return db.query.nation.findMany(query({ where: { alpha3Code: { in: alpha3Codes } } }));
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
			return findPlausibilityIssues(ctx, args.conferenceId);
		}
	})
}));
