import { db, schema } from '#api/db/db';
import type { ApiContext } from '#api/rumble';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { ConferenceSeedingSchema } from '#lib/seeding/seedSchema';
import { m } from '#lib/paraglide/messages';
import { sql } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';
import type { InferSelectModel } from 'drizzle-orm';
import {
	PARTICIPANT_MAX_AGE,
	PARTICIPANT_MIN_AGE,
	SUPERVISOR_MIN_AGE,
	yearsAgo
} from '#lib/helpers/plausibilityRules';
import { userFormSchema } from '../../../routes/(authenticated)/my-account/form-schema';
import { nullToUndefined } from '#api/services/args';
import { totalSeats } from '#api/services/seatPlanning';
import { MAX_NAMETAG_BINS } from '#api/handlers/nametagBins/bins';
import { isConferenceLanguage } from '#lib/helpers/conferenceLanguage';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';
import { apiError } from '#api/services/errors/apiError';
import { documentLayoutSchema, type LayoutDocument } from '#lib/helpers/documentLayout';

/** Everyone who actually holds a seat - delegates of assigned delegations plus role holders. */
export async function countSeatedParticipants(conferenceId: string) {
	const [members, participants] = await Promise.all([
		db.query.delegationMember.findMany({
			where: {
				delegation: { conferenceId: conferenceId, assignedRoleId: { isNotNull: true } }
			},
			columns: { id: true }
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId }, assignedRoleId: { isNotNull: true } },
			columns: { id: true }
		})
	]);

	return members.length + participants.length;
}

/**
 * Seats on offer: every nation of a committee is worth its `numOfSeatsPerDelegation`, every
 * non-state actor its `seatAmount`.
 */
export async function countOfferedSeats(conferenceId: string) {
	const [committees, nonStateActors] = await Promise.all([
		db.query.committee.findMany({
			where: { conferenceId },
			columns: { numOfSeatsPerDelegation: true },
			with: { roles: { columns: { id: true } } }
		}),
		db.query.conferenceRole.findMany({
			where: { conferenceId: conferenceId, kind: 'NON_STATE_ACTOR' },
			columns: { seatAmount: true }
		})
	]);

	return totalSeats(committees, nonStateActors);
}

/** The settings with a closed set of values; an omitted or cleared one is left to the column. */
export function assertValidConferenceSettings(args: {
	nametagBinCount?: number | null;
	maxSeatsPerSchool?: number | null;
	language?: string | null;
}) {
	if (args.maxSeatsPerSchool != null && args.maxSeatsPerSchool < 1) {
		throw apiError('INVALID_INPUT', m.conferenceMaxSeatsPerSchoolRange());
	}

	if (
		args.nametagBinCount != null &&
		!(args.nametagBinCount >= 1 && args.nametagBinCount <= MAX_NAMETAG_BINS)
	) {
		throw apiError('INVALID_INPUT', m.conferenceNametagBinsRange({ max: MAX_NAMETAG_BINS }));
	}

	if (args.language != null && !isConferenceLanguage(args.language)) {
		throw apiError('INVALID_INPUT', m.conferenceLanguageUnsupported());
	}
}

type ConferenceInsert = typeof schema.conference.$inferInsert;
/** The arguments of `updateConference`: any column but the id, left out or cleared with null. */
export type ConferenceUpdateArgs = { id: string } & {
	[K in keyof Omit<ConferenceInsert, 'id'>]?: ConferenceInsert[K] | null;
};

/**
 * Writes the conference's settings and answers whether there was a row to write. Who may send
 * which argument, and store which file, is checked before (`assertCanUpdateConference`,
 * `assertCanClaimConferenceFiles`), as are the settings (`assertValidConferenceSettings`).
 */
export async function updateConference(args: ConferenceUpdateArgs) {
	// An omitted file leaves the stored one untouched; only a supplied file replaces it.
	const files = {
		imageFileId: await ensureUploadComplete(args.imageFileId),
		emblemFileId: await ensureUploadComplete(args.emblemFileId),
		logoFileId: await ensureUploadComplete(args.logoFileId),
		contractFileId: await ensureUploadComplete(args.contractFileId),
		guardianConsentFileId: await ensureUploadComplete(args.guardianConsentFileId),
		mediaConsentFileId: await ensureUploadComplete(args.mediaConsentFileId),
		termsAndConditionsFileId: await ensureUploadComplete(args.termsAndConditionsFileId),
		certificateFileId: await ensureUploadComplete(args.certificateFileId)
	};

	const updated = await db
		.update(schema.conference)
		// An omitted argument arrives as `undefined` and leaves the column alone; an
		// explicit `null` clears it. Only the non-nullable columns coerce null away.
		.set({
			title: nullToUndefined(args.title),
			longTitle: args.longTitle,
			location: args.location,
			language: args.language,
			website: args.website,
			info: args.info,
			showInfoExpanded: nullToUndefined(args.showInfoExpanded),
			linkToPreparationGuide: args.linkToPreparationGuide,
			linkToTeamWiki: args.linkToTeamWiki,
			linkToServicesPage: args.linkToServicesPage,
			linkToPaperInbox: args.linkToPaperInbox,
			isOpenPaperSubmission: nullToUndefined(args.isOpenPaperSubmission),
			showCalendar: nullToUndefined(args.showCalendar),
			timezone: nullToUndefined(args.timezone),
			nametagBinCount: nullToUndefined(args.nametagBinCount),
			// null lifts the limit
			maxSeatsPerSchool: args.maxSeatsPerSchool,
			state: nullToUndefined(args.state),
			applicationDeadline: nullToUndefined(args.applicationDeadline),
			startConference: nullToUndefined(args.startConference),
			endConference: nullToUndefined(args.endConference),
			registrationDeadlineGracePeriodMinutes: nullToUndefined(
				args.registrationDeadlineGracePeriodMinutes
			),
			unlockPayments: nullToUndefined(args.unlockPayments),
			unlockPostals: nullToUndefined(args.unlockPostals),
			feeAmount: args.feeAmount,
			bankAccountHolder: args.bankAccountHolder,
			iban: args.iban,
			bic: args.bic,
			bankName: args.bankName,
			currency: args.currency,
			postalName: args.postalName,
			postalStreet: args.postalStreet,
			postalApartment: args.postalApartment,
			postalZip: args.postalZip,
			postalCity: args.postalCity,
			postalCountry: args.postalCountry,
			...files
		})
		.where(whereRows(schema.conference, { id: args.id }))
		.returning({ id: schema.conference.id });

	return updated.length > 0;
}

/**
 * Creates a whole conference - committees, non-state actors and custom roles - from a seeding
 * document. Admin only.
 */
export async function seedConference(input: unknown) {
	if (!input) {
		throw apiError('INVALID_INPUT', m.plausibilityIncompleteOrInvalidData());
	}

	const data = ConferenceSeedingSchema.parse(input);

	// Checked before the transaction so every offending code can be reported at once: a
	// nation with no row cannot be linked to a committee, and failing mid-transaction would
	// only reveal the first one.
	const knownAlpha2Codes = new Set(
		(await db.query.nation.findMany({ columns: { alpha2Code: true } })).map((nation) =>
			nation.alpha2Code.toLowerCase()
		)
	);
	const unknownNations = data.committees.flatMap((committee) =>
		committee.nations
			.filter((nation) => !knownAlpha2Codes.has(nation.toLowerCase()))
			.map((nation) => `${committee.abbreviation}: ${nation}`)
	);
	if (unknownNations.length > 0) {
		throw apiError(
			'INVALID_INPUT',
			m.conferenceSeedingUnknownNations({ nations: unknownNations.join(', ') })
		);
	}

	const created = await db.transaction(async (tx) => {
		const conference = await tx
			.insert(schema.conference)
			.values(data.conference)
			.returning()
			.then(assertFirstEntryExists);

		for (const nsa of data.nsa) {
			await tx
				.insert(schema.conferenceRole)
				.values({ conferenceId: conference.id, kind: 'NON_STATE_ACTOR', ...nsa });
		}

		for (const role of data.customConferenceRole) {
			await tx
				.insert(schema.conferenceRole)
				.values({ conferenceId: conference.id, kind: 'CUSTOM', ...role });
		}

		for (const committee of data.committees) {
			const { nations, ...committeeData } = committee;
			const row = await tx
				.insert(schema.committee)
				.values({ ...committeeData, conferenceId: conference.id })
				.returning()
				.then(assertFirstEntryExists);

			// The seeding document names nations by alpha-2; each one seated becomes a nation role
			// of the conference (once, however many committees seat it) and is linked to the committee.
			for (const alpha2 of nations) {
				const nation = await tx.query.nation.findFirst({
					where: { alpha2Code: alpha2.toLowerCase() },
					columns: { alpha3Code: true }
				});
				if (!nation) continue;
				await tx
					.insert(schema.conferenceRole)
					.values({
						conferenceId: conference.id,
						kind: 'NATION',
						nationAlpha3Code: nation.alpha3Code
					})
					.onConflictDoNothing();
				const role = await tx.query.conferenceRole
					.findFirst({
						where: { conferenceId: conference.id, nationAlpha3Code: nation.alpha3Code },
						columns: { id: true }
					})
					.then(assertFindFirstExists);
				await tx
					.insert(schema.committeeToRole)
					.values({ a: row.id, b: role.id })
					.onConflictDoNothing();
			}
		}

		return conference;
	});

	return created;
}

export type PlausibilityUser = InferSelectModel<typeof schema.user>;

/**
 * The registration form still names these two fields the way the OIDC claims do, so a database
 * row has to be renamed into that shape before the form's schema can judge it complete.
 */
function toFormShape(user: PlausibilityUser) {
	const { givenName, familyName, ...rest } = user;
	return { ...rest, given_name: givenName, family_name: familyName };
}

/** The caller's `read` filter on users, which decides who the plausibility lists may show. */
export type ReadableUsers = Awaited<ReturnType<ApiContext['abilities']['user']['filter']>>;

/**
 * Flags participants whose age does not fit the role they registered for, plus those whose
 * account data no longer satisfies the registration form.
 */
export async function findPlausibilityIssues(conferenceId: string, readableUsers: ReadableUsers) {
	const participating = {
		OR: [
			{ singleParticipant: { participant: { conferenceId } } },
			{ delegationMemberships: { participant: { conferenceId } } }
		]
	};
	const supervising = { conferenceSupervisor: { participant: { conferenceId } } };

	const [tooYoungUsers, tooOldUsers, shouldBeSupervisor, shouldNotBeSupervisor, candidates] =
		await Promise.all([
			db.query.user.findMany(
				readableUsers.merge({
					where: { ...participating, birthday: { gt: yearsAgo(PARTICIPANT_MIN_AGE) } }
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: {
						...participating,
						birthday: { lt: yearsAgo(SUPERVISOR_MIN_AGE), gt: yearsAgo(PARTICIPANT_MAX_AGE) }
					}
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: { ...participating, birthday: { lt: yearsAgo(PARTICIPANT_MAX_AGE) } }
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: { ...supervising, birthday: { gt: yearsAgo(SUPERVISOR_MIN_AGE) } }
				}).query.many
			),
			db.query.user.findMany(
				readableUsers.merge({
					where: {
						OR: [
							{ singleParticipant: { participant: { conferenceId } } },
							{ delegationMemberships: { participant: { conferenceId } } },
							{ conferenceSupervisor: { participant: { conferenceId } } }
						]
					}
				}).query.many
			)
		]);

	return {
		tooYoungUsers,
		tooOldUsers,
		shouldBeSupervisor,
		shouldNotBeSupervisor,
		dataMissing: candidates.filter((user) => !userFormSchema.safeParse(toFormShape(user)).success)
	};
}

/**
 * Stores where a document's generated parts go on its template; null goes back to the defaults.
 * The other documents' layouts stay as they are. Answers whether the conference exists.
 */
export async function setDocumentLayout(
	conferenceId: string,
	document: LayoutDocument,
	layout: unknown
) {
	const column = schema.conference.documentLayouts;
	let value;
	if (layout === null || layout === undefined) {
		value = sql`coalesce(${column}, '{}'::jsonb) - ${document}::text`;
	} else {
		const parsed = documentLayoutSchema(document).safeParse(layout);
		if (!parsed.success) throw apiError('INVALID_INPUT', m.documentLayoutInvalid());
		value = sql`coalesce(${column}, '{}'::jsonb) || jsonb_build_object(${document}::text, ${JSON.stringify(parsed.data)}::jsonb)`;
	}
	const updated = await db
		.update(schema.conference)
		.set({ documentLayouts: value })
		.where(whereRows(schema.conference, { id: conferenceId }))
		.returning({ id: schema.conference.id });
	return updated.length > 0;
}
