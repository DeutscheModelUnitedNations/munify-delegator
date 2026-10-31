import { db } from '#api/db/db';
import { object, query, schemaBuilder } from '#api/rumble';
import { assertFindFirstExists } from '@m1212e/rumble';
import { NationRef } from '#api/handlers/nation/nation';
import { enum_, type ApiContext } from '#api/rumble';
import { UserRef } from '#api/handlers/user/user';
import {
	documentLayoutArgsSchema,
	countOfferedSeats,
	countSeatedParticipants,
	countWaitingList,
	findPlausibilityIssues,
	nextDocumentNumber,
	seedConference,
	seedingDataSchema,
	setDocumentLayout,
	updateConference,
	type PlausibilityUser
} from './conferenceService';
import { conferenceSettingSchemas } from './conferenceSettings';
import {
	assertCanClaimConferenceFiles,
	assertCanReadConference,
	assertCanReadNextDocumentNumber,
	assertCanReadPlausibility,
	assertCanSeedConference,
	assertCanSetDocumentLayout,
	assertCanUpdateConference,
	registerConferenceAbilities
} from './conferencePermissions';
import { LAYOUT_DOCUMENTS } from '#lib/helpers/documentLayout';
import { loadSchoolRows } from '#api/handlers/schoolSuggestion/schoolSuggestions';
import { readableSchoolRegistrations } from '#api/handlers/schoolSuggestion/schoolSuggestionPermissions';

/** The documents whose templates the team lays out (`#lib/helpers/documentLayout.ts`). */
const LayoutDocumentEnum = schemaBuilder.enumType('LayoutDocument', { values: LAYOUT_DOCUMENTS });

const ConferenceSchools = schemaBuilder.simpleObject('ConferenceSchools', {
	fields: (t) => ({
		schoolId: t.id(),
		school: t.string({ description: "The school's name" }),
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
		totalParticipants: t.field({
			description:
				'Everyone who actually holds a seat - delegates of assigned delegations plus role holders.',
			type: 'Int',
			resolve: (conference) => countSeatedParticipants(conference.id)
		}),

		totalSeats: t.field({
			description:
				'Seats on offer: every nation of a committee is worth its `numOfSeatsPerDelegation`, every non-state actor its `seatAmount`.',
			type: 'Int',
			resolve: (conference) => countOfferedSeats(conference.id)
		}),

		waitingListLength: t.field({
			description: "How many entries the conference's waiting list holds, hidden ones included.",
			type: 'Int',
			resolve: (conference) => countWaitingList(conference.id)
		}),

		nextDocumentNumber: t.field({
			description:
				'The document number to hand to the next participant who needs one. Participant care only; anybody else gets FORBIDDEN.',
			type: 'Int',
			resolve: async (conference, _args, ctx) => {
				await assertCanReadNextDocumentNumber({ ctx, conferenceId: conference.id });
				return nextDocumentNumber(conference.id);
			}
		}),

		schools: t.field({
			description:
				'The people of applied registrations grouped by their own school, which is how the organizers see which schools are sending how many people.',
			type: [ConferenceSchools],
			resolve: async (conference, _args, ctx) =>
				loadSchoolRows(await readableSchoolRegistrations({ ctx, conferenceId: conference.id }))
		})
	})
});

query({ table: 'conference' });

const conferenceStateEnum = enum_({ tsName: 'conferenceState' });

/** The conference as the caller may read it, for re-reading the row a mutation wrote. */
async function readableConference({ ctx, id }: { ctx: ApiContext; id: string }) {
	return (await ctx.abilities.conference.filter('read')).merge({ where: { id } }).query.single;
}

/** What the `…FileId` arguments of `updateConference` say. */
const fileArgDescription =
	'A file uploaded through `requestFileUpload` for this field of this conference; `null` removes the stored one, left out keeps it.';

schemaBuilder.mutationFields((t) => ({
	updateConference: t.drizzleField({
		description:
			'Changes the given settings of a conference; left out keeps a setting, `null` clears a nullable one. Project management changes everything; the content roles (participant care, content lead) only the links, the announcement, the postal address, the templates, the status and the feature switches - any other argument is refused with FORBIDDEN. Uploaded files (logo, templates) are passed by the id `requestFileUpload` returned.',
		type: ConferenceRef,
		args: {
			id: t.arg.id({ required: true }),
			title: t.arg.string(),
			longTitle: t.arg.string(),
			location: t.arg.string(),
			language: t.arg
				.string({ description: 'A conference language (`de`, `en`, …).' })
				.validate(conferenceSettingSchemas.language),
			website: t.arg.string(),
			info: t.arg.string(),
			showInfoExpanded: t.arg.boolean(),
			linkToPreparationGuide: t.arg.string(),
			linkToTeamWiki: t.arg.string(),
			linkToServicesPage: t.arg.string(),
			linkToPaperInbox: t.arg.string(),
			isOpenPaperSubmission: t.arg.boolean(),
			showCalendar: t.arg.boolean(),
			timezone: t.arg
				.string({ description: 'An IANA time zone, such as `Europe/Berlin`.' })
				.validate(conferenceSettingSchemas.timezone),
			nametagBinCount: t.arg
				.int({ description: 'How many tables the nametags are handed out at.' })
				.validate(conferenceSettingSchemas.nametagBinCount),
			maxSeatsPerSchool: t.arg
				.int({
					description:
						'How many seats one school may be given before the assignment warns; `null` for no limit.'
				})
				.validate(conferenceSettingSchemas.maxSeatsPerSchool),
			state: t.arg({ type: conferenceStateEnum }),
			applicationDeadline: t.arg({ type: 'DateTime' }),
			startConference: t.arg({ type: 'DateTime' }),
			endConference: t.arg({ type: 'DateTime' }),
			registrationDeadlineGracePeriodMinutes: t.arg
				.int({
					description: 'How long after the application deadline applications are still taken.'
				})
				.validate(conferenceSettingSchemas.registrationDeadlineGracePeriodMinutes),
			unlockPayments: t.arg.boolean(),
			unlockPostals: t.arg.boolean(),
			feeAmount: t.arg.float().validate(conferenceSettingSchemas.feeAmount),
			bankAccountHolder: t.arg.string(),
			iban: t.arg.string(),
			bic: t.arg.string(),
			bankName: t.arg.string(),
			currency: t.arg
				.string({ description: 'A three letter code, such as `EUR`.' })
				.validate(conferenceSettingSchemas.currency),
			postalName: t.arg.string(),
			postalStreet: t.arg.string(),
			postalApartment: t.arg.string(),
			postalZip: t.arg.string(),
			postalCity: t.arg.string(),
			postalCountry: t.arg.string(),
			imageFileId: t.arg.id({ description: fileArgDescription }),
			emblemFileId: t.arg.id({ description: fileArgDescription }),
			logoFileId: t.arg.id({ description: fileArgDescription }),
			contractFileId: t.arg.id({ description: fileArgDescription }),
			guardianConsentFileId: t.arg.id({ description: fileArgDescription }),
			mediaConsentFileId: t.arg.id({ description: fileArgDescription }),
			termsAndConditionsFileId: t.arg.id({ description: fileArgDescription }),
			certificateFileId: t.arg.id({ description: fileArgDescription })
		},
		resolve: async (query, _root, args, ctx) => {
			await assertCanUpdateConference({ ctx, args });
			await assertCanClaimConferenceFiles({ ctx, args });
			await updateConference(args);

			return db.query.conference
				.findFirst(query(await readableConference({ ctx, id: args.id })))
				.then(assertFindFirstExists);
		}
	}),

	setDocumentLayout: t.drizzleField({
		description:
			"Places a document's generated parts on the conference's template (the layout editor in the document settings); `null` returns that document to the default positions. A layout that does not fit the document is refused with INVALID_INPUT.",
		// The conference, so the client's cache holds the new layouts at once.
		type: ConferenceRef,
		args: t.validate(
			{
				conferenceId: t.arg.id({ required: true }),
				document: t.arg({ type: LayoutDocumentEnum, required: true }),
				layout: t.arg({
					type: 'JSON',
					description:
						'Where each element goes, by the element names of `#lib/helpers/documentLayout`; elements left out keep their defaults.'
				})
			},
			documentLayoutArgsSchema
		),
		resolve: async (query, _root, args, ctx) => {
			await assertCanSetDocumentLayout({ ctx, conferenceId: args.conferenceId });
			await setDocumentLayout(args);

			return db.query.conference
				.findFirst(query(await readableConference({ ctx, id: args.conferenceId })))
				.then(assertFindFirstExists);
		}
	}),

	seedNewConference: t.drizzleField({
		description:
			'Creates a whole conference - committees, non-state actors and custom roles - from a seeding document (JSON, as string or parsed). System admins only. A malformed document, or one naming unknown nations, is refused with INVALID_INPUT.',
		type: ConferenceRef,
		args: { data: t.arg({ type: 'JSON', required: true }).validate(seedingDataSchema) },
		resolve: async (query, _root, args, ctx) => {
			assertCanSeedConference(ctx);
			const id = await seedConference(args.data);

			return db.query.conference
				.findFirst(query(await readableConference({ ctx, id })))
				.then(assertFindFirstExists);
		}
	})
}));

schemaBuilder.queryFields((t) => ({
	getAllConferenceNations: t.drizzleField({
		description:
			"Every nation seated in any of a conference's committees, each once. NOT_FOUND for a conference the caller may not read.",
		type: [NationRef],
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (query, _root, args, ctx) => {
			await assertCanReadConference({ ctx, conferenceId: args.conferenceId });

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
	conferencePlausibility: t.field({
		description:
			'Flags participants whose age does not fit the role they registered for, plus those whose account data no longer satisfies the registration form. Purely advisory - nothing here blocks a registration, it only gives the organizers a list to look at.',
		type: PlausibilityResult,
		args: { conferenceId: t.arg.id({ required: true }) },
		resolve: async (_root, args, ctx) => {
			await assertCanReadPlausibility({ ctx, conferenceId: args.conferenceId });
			return findPlausibilityIssues({
				conferenceId: args.conferenceId,
				readableUsers: await ctx.abilities.user.filter('read')
			});
		}
	})
}));
