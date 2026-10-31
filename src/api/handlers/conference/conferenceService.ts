import { db, schema } from '#api/db/db';
import { assertConferenceDatesInOrder } from './conferenceSettings';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { ConferenceSeedingSchema } from '#lib/seeding/seedSchema';
import { m } from '#lib/paraglide/messages';
import { and, eq, inArray, max, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { whereRows } from '#api/db/whereRows';
import { nullToUndefined } from '#api/services/args';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';
import { apiError } from '#api/services/errors';
import { documentLayoutSchema, type LayoutDocument } from '#lib/helpers/documentLayout';
import { jsonDocument } from '#api/services/argSchemas';
import { z } from 'zod';
import {
	committeePubsub,
	conferencePubsub,
	conferenceRolePubsub,
	delegationMemberPubsub,
	delegationPubsub,
	singleParticipantPubsub
} from '#api/pubsub';

/** Everyone who actually holds a seat - delegates of assigned delegations plus role holders. */
export async function countSeatedParticipants(conferenceId: string) {
	const [members, participants] = await Promise.all([
		db.$count(
			schema.delegationMember,
			inArray(
				schema.delegationMember.delegationId,
				db
					.select({ id: schema.delegation.id })
					.from(schema.delegation)
					.where(
						whereRows({
							table: schema.delegation,
							filter: { conferenceId, assignedRoleId: { isNotNull: true } }
						})
					)
			)
		),
		db.$count(
			schema.singleParticipant,
			and(
				whereRows({
					table: schema.singleParticipant,
					filter: { assignedRoleId: { isNotNull: true } }
				}),
				inArray(
					schema.singleParticipant.conferenceParticipantId,
					db
						.select({ id: schema.conferenceParticipant.id })
						.from(schema.conferenceParticipant)
						.where(whereRows({ table: schema.conferenceParticipant, filter: { conferenceId } }))
				)
			)
		)
	]);

	return members + participants;
}

/** How many entries the conference's waiting list holds, hidden ones included. */
export function countWaitingList(conferenceId: string) {
	return db.$count(
		schema.waitingListEntry,
		whereRows({ table: schema.waitingListEntry, filter: { conferenceId } })
	);
}

/**
 * Seats on offer: every nation of a committee is worth its `numOfSeatsPerDelegation`, every
 * non-state actor its `seatAmount`.
 */
export async function countOfferedSeats(conferenceId: string) {
	const seatSum = (column: AnyPgColumn) => sql<number>`coalesce(sum(${column}), 0)`.mapWith(Number);

	const [[committeeSeats], [nsaSeats]] = await Promise.all([
		db
			.select({ seats: seatSum(schema.committee.numOfSeatsPerDelegation) })
			.from(schema.committeeToRole)
			.innerJoin(schema.committee, eq(schema.committeeToRole.a, schema.committee.id))
			.where(whereRows({ table: schema.committee, filter: { conferenceId } })),
		db
			.select({ seats: seatSum(schema.conferenceRole.seatAmount) })
			.from(schema.conferenceRole)
			.where(
				whereRows({
					table: schema.conferenceRole,
					filter: { conferenceId, kind: 'NON_STATE_ACTOR' }
				})
			)
	]);

	return committeeSeats.seats + nsaSeats.seats;
}

/** The document number to hand to the next participant who needs one: one above the highest. */
export async function nextDocumentNumber(conferenceId: string) {
	const [highest] = await db
		.select({ max: max(schema.conferenceParticipant.assignedDocumentNumber) })
		.from(schema.conferenceParticipant)
		.where(whereRows({ table: schema.conferenceParticipant, filter: { conferenceId } }));
	return (highest?.max ?? 0) + 1;
}

type ConferenceInsert = typeof schema.conference.$inferInsert;
/**
 * The arguments of `updateConference`: any column but the id, left out or cleared with null.
 * `documentLayout` places one document's generated parts and keeps the others' layouts; a null
 * layout goes back to the defaults. `assignmentReleased` shows participants their roles, or hides
 * them again.
 */
export type ConferenceUpdateArgs = { id: string } & {
	[
		K in keyof Omit<
			ConferenceInsert,
			'id' | 'documentLayouts' | 'assignmentReleased' | 'assignmentReleasedAt'
		>
	]?: ConferenceInsert[K] | null;
} & {
	documentLayout?: {
		document: LayoutDocument;
		layout?: z.output<ReturnType<typeof documentLayoutSchema>> | null;
	};
	assignmentReleased?: boolean;
};

/** The `documentLayouts` value writing one document's layout, or `undefined` for none. */
function documentLayoutsValue(change: ConferenceUpdateArgs['documentLayout']) {
	if (!change) return undefined;
	const column = schema.conference.documentLayouts;
	return change.layout == null
		? sql`coalesce(${column}, '{}'::jsonb) - ${change.document}::text`
		: sql`coalesce(${column}, '{}'::jsonb) || jsonb_build_object(${change.document}::text, ${JSON.stringify(change.layout)}::jsonb)`;
}

/**
 * Writes the given settings of the conference; left out keeps a setting, `null` clears a nullable
 * one. Who may send which argument, and store which file, is checked before
 * (`assertCanUpdateConference`, `assertCanClaimConferenceFiles`, `assertCanSetDocumentLayout`,
 * `assertCanPlanAssignment`), the values with the arguments (`conferenceSettingSchemas` in
 * `conferenceSettings.ts`); an uploaded file has to have arrived in full.
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

	await db.transaction(async (tx) => {
		const [written] = await tx
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
				...files,
				documentLayouts: documentLayoutsValue(args.documentLayout),
				assignmentReleased: args.assignmentReleased,
				assignmentReleasedAt:
					args.assignmentReleased === undefined
						? undefined
						: args.assignmentReleased
							? new Date()
							: null
			})
			.where(whereRows({ table: schema.conference, filter: { id: args.id } }))
			.returning({
				applicationDeadline: schema.conference.applicationDeadline,
				startConference: schema.conference.startConference,
				endConference: schema.conference.endConference
			});
		// Checked on the row as written: a change may give only one of the dates.
		if (written) assertConferenceDatesInOrder(written);
	});
	conferencePubsub.updated(args.id);
	if (args.assignmentReleased !== undefined) await announceReleaseVisibility(args.id);
}

/** Announces the rows whose readable columns the release flag decides. */
async function announceReleaseVisibility(conferenceId: string) {
	const [delegations, members, singles] = await Promise.all([
		db.query.delegation.findMany({ where: { conferenceId }, columns: { id: true } }),
		db.query.delegationMember.findMany({
			where: { participant: { conferenceId } },
			columns: { id: true }
		}),
		db.query.singleParticipant.findMany({
			where: { participant: { conferenceId } },
			columns: { id: true }
		})
	]);
	/** Announces the rows as updated, unless there are none. */
	const announce = (pubsub: { updated: (ids: string[]) => void }, rows: { id: string }[]) => {
		if (rows.length > 0) pubsub.updated(rows.map((row) => row.id));
	};
	announce(delegationPubsub, delegations);
	announce(delegationMemberPubsub, members);
	announce(singleParticipantPubsub, singles);
}

/** A seeding document, as JSON string or parsed. */
export const seedingDataSchema = jsonDocument({
	schema: ConferenceSeedingSchema,
	malformed: () => m.plausibilityIncompleteOrInvalidData(),
	invalid: (details) => m.conferenceSeedingInvalid({ details })
});
type ConferenceSeedingData = z.output<typeof seedingDataSchema>;

/**
 * Creates a whole conference - committees, non-state actors and custom roles - from a seeding
 * document. Refuses (INVALID_INPUT) a document naming nations there are no rows for, listing them
 * all. Returns the conference's id.
 */
export async function seedConference(data: ConferenceSeedingData) {
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
		throw apiError({
			code: 'INVALID_INPUT',
			message: m.conferenceSeedingUnknownNations({ nations: unknownNations.join(', ') })
		});
	}

	const created = await db.transaction(async (tx) => {
		const conference = await tx
			.insert(schema.conference)
			.values(data.conference)
			.returning({ id: schema.conference.id })
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
	conferencePubsub.created();
	// with its committees and roles
	committeePubsub.created();
	conferenceRolePubsub.created();

	return created.id;
}
