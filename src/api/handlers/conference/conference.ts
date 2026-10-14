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
import { storedFileUrl } from '$api/services/files/files';
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
	contractContent: false,
	guardianConsentContent: false,
	mediaConsentContent: false,
	termsAndConditionsContent: false,
	certificateContent: false
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
		// The four document templates and the certificate template are long HTML blobs. The
		// configuration UI only needs to know whether each one has been filled in, so these
		// flags let it avoid transferring the content itself.
		contractContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.contractContent
		}),
		guardianConsentContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.guardianConsentContent
		}),
		mediaConsentContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.mediaConsentContent
		}),
		termsAndConditionsContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.termsAndConditionsContent
		}),
		certificateContentSet: t.field({
			type: 'Boolean',
			resolve: (conference) => !!conference.certificateContent
		}),

		// The uploaded images and templates are megabytes of base64. These URLs serve them as real
		// files, which the browser caches; they are null when nothing is stored (or the reader may
		// not see it). The files themselves are not meant to be selected any more.
		imageUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl('conference', conference, 'image', conference.imageDataURL)
		}),
		emblemUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl('conference', conference, 'emblem', conference.emblemDataURL)
		}),
		logoUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl('conference', conference, 'logo', conference.logoDataURL)
		}),
		contractContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl('conference', conference, 'contract', conference.contractContent)
		}),
		guardianConsentContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl(
					'conference',
					conference,
					'guardianConsent',
					conference.guardianConsentContent
				)
		}),
		mediaConsentContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl('conference', conference, 'mediaConsent', conference.mediaConsentContent)
		}),
		termsAndConditionsContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl(
					'conference',
					conference,
					'termsAndConditions',
					conference.termsAndConditionsContent
				)
		}),
		certificateContentUrl: t.field({
			type: 'String',
			nullable: true,
			resolve: (conference) =>
				storedFileUrl('conference', conference, 'certificate', conference.certificateContent)
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
			// Uploads arrive as data URLs rather than multipart files. Rumble's builder has a fixed
			// scalar map with no `File`, and these columns store data URLs regardless, so the
			// encoding moves to the client and the multipart path disappears.
			imageDataURL: t.arg.string(),
			emblemDataURL: t.arg.string(),
			logoDataURL: t.arg.string(),
			contractContent: t.arg.string(),
			guardianConsentContent: t.arg.string(),
			mediaConsentContent: t.arg.string(),
			termsAndConditionsContent: t.arg.string(),
			certificateContent: t.arg.string()
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
