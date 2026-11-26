import { db, schema, type Transaction } from '#api/db/db';
import { assertAgeRangeInOrder, assertConferenceDatesInOrder } from './conferenceSettings';
import { assertFindFirstExists, assertFirstEntryExists } from '@m1212e/rumble';
import { ConferenceSeedingSchema } from '#lib/seeding/seedSchema';
import { m } from '#lib/paraglide/messages';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { AnyPgColumn } from 'drizzle-orm/pg-core';
import { whereRows } from '#api/db/whereRows';
import { nullToUndefined } from '#api/services/args';
import { ensureUploadComplete } from '#api/handlers/storedFile/storedFileService';
import { apiError } from '#api/services/errors';
import { isPhosphorIcon } from '#api/services/iconName';
import { documentLayoutSchema, type LayoutDocument } from '#lib/helpers/documentLayout';
import { jsonDocument } from '#api/services/argSchemas';
import { z } from 'zod';
import {
	newlyUnmetFeatures,
	type ConferenceFeatureFacts,
	type FeatureSwitches
} from '#lib/helpers/conferenceFeatures';
import { featureLabel, featureRequirementLabel } from '#lib/helpers/conferenceFeatureLabels';
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
		// Locked, so the feature check below compares against what this write started from.
		const [before] = await tx
			.select(featureColumns)
			.from(schema.conference)
			.where(whereRows({ table: schema.conference, filter: { id: args.id } }))
			.for('update');
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
				linkToPreparationGuide: args.linkToPreparationGuide,
				linkToTeamWiki: args.linkToTeamWiki,
				linkToServicesPage: args.linkToServicesPage,
				linkToPaperInbox: args.linkToPaperInbox,
				isOpenPaperSubmission: nullToUndefined(args.isOpenPaperSubmission),
				showCalendar: nullToUndefined(args.showCalendar),
				messagingEnabled: nullToUndefined(args.messagingEnabled),
				guidePublished: nullToUndefined(args.guidePublished),
				seriesId: args.seriesId,
				qrCorporateDesign: nullToUndefined(args.qrCorporateDesign),
				timezone: nullToUndefined(args.timezone),
				nametagBinCount: nullToUndefined(args.nametagBinCount),
				// null switches the rule off, or lifts the limit
				maxCollectiveGroupSize: args.maxCollectiveGroupSize,
				maxGuaranteedSeatsPerForeignSchool: args.maxGuaranteedSeatsPerForeignSchool,
				maxForeignGuaranteedSeatsPercent: args.maxForeignGuaranteedSeatsPercent,
				// null switches the limit off
				participantMinAge: args.participantMinAge,
				participantMaxAge: args.participantMaxAge,
				supervisorMinAge: args.supervisorMinAge,
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
				paymentDeadline: args.paymentDeadline,
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
				endConference: schema.conference.endConference,
				participantMinAge: schema.conference.participantMinAge,
				participantMaxAge: schema.conference.participantMaxAge,
				...featureColumns
			});
		// Checked on the row as written: a change may give only one of the dates or ages.
		if (written) {
			assertConferenceDatesInOrder(written);
			assertAgeRangeInOrder(written);
		}
		if (before && written) {
			const content = await loadConferenceFeatureContent({ conferenceId: args.id, tx });
			assertFeatureRequirementsMet({
				before: featureState({ row: before, content }),
				after: featureState({ row: written, content })
			});
		}
	});
	conferencePubsub.updated(args.id);
	if (args.assignmentReleased !== undefined) await announceReleaseVisibility(args.id);
}

/** The conference columns the feature switches and their requirements are decided on. */
const featureColumns = {
	unlockPayments: schema.conference.unlockPayments,
	unlockPostals: schema.conference.unlockPostals,
	isOpenPaperSubmission: schema.conference.isOpenPaperSubmission,
	showCalendar: schema.conference.showCalendar,
	messagingEnabled: schema.conference.messagingEnabled,
	guidePublished: schema.conference.guidePublished,
	feeAmount: schema.conference.feeAmount,
	currency: schema.conference.currency,
	bankAccountHolder: schema.conference.bankAccountHolder,
	iban: schema.conference.iban,
	postalName: schema.conference.postalName,
	postalStreet: schema.conference.postalStreet,
	postalZip: schema.conference.postalZip,
	postalCity: schema.conference.postalCity,
	postalCountry: schema.conference.postalCountry,
	contractFileId: schema.conference.contractFileId,
	guardianConsentFileId: schema.conference.guardianConsentFileId,
	mediaConsentFileId: schema.conference.mediaConsentFileId,
	termsAndConditionsFileId: schema.conference.termsAndConditionsFileId
};
type FeatureRow = Pick<typeof schema.conference.$inferSelect, keyof typeof featureColumns>;

/** What feature requirements other tables decide: agenda items, calendar days, the published guide. */
export type ConferenceFeatureContent = Pick<
	ConferenceFeatureFacts,
	'hasAgendaItem' | 'hasCalendarDay' | 'hasPublishedGuide'
>;

/** Loads the feature requirements that live outside the conference row. */
export async function loadConferenceFeatureContent({
	conferenceId,
	tx = db
}: {
	conferenceId: string;
	tx?: Transaction | typeof db;
}): Promise<ConferenceFeatureContent> {
	const [agendaItem, calendarDay, outline] = await Promise.all([
		tx.query.committeeAgendaItem.findFirst({
			where: { committee: { conferenceId } },
			columns: { id: true }
		}),
		tx.query.calendarDay.findFirst({ where: { conferenceId }, columns: { id: true } }),
		tx.query.guideOutline.findFirst({
			where: { conferenceId, published: { isNotNull: true } },
			columns: { id: true }
		})
	]);
	return {
		hasAgendaItem: !!agendaItem,
		hasCalendarDay: !!calendarDay,
		hasPublishedGuide: !!outline
	};
}

function featureState({ row, content }: { row: FeatureRow; content: ConferenceFeatureContent }) {
	const switches: FeatureSwitches = {
		unlockPayments: row.unlockPayments,
		unlockPostals: row.unlockPostals,
		isOpenPaperSubmission: row.isOpenPaperSubmission,
		showCalendar: row.showCalendar,
		messagingEnabled: row.messagingEnabled,
		guidePublished: row.guidePublished
	};
	const facts: ConferenceFeatureFacts = {
		...content,
		feeAmount: row.feeAmount,
		currency: row.currency,
		bankAccountHolder: row.bankAccountHolder,
		iban: row.iban,
		postalName: row.postalName,
		postalStreet: row.postalStreet,
		postalZip: row.postalZip,
		postalCity: row.postalCity,
		postalCountry: row.postalCountry,
		postalTemplates:
			!!row.contractFileId &&
			!!row.guardianConsentFileId &&
			!!row.mediaConsentFileId &&
			!!row.termsAndConditionsFileId
	};
	return { switches, facts };
}

/**
 * Refuses (CONFLICT) a change that leaves a feature switched on without something it needs, naming
 * what is missing (`newlyUnmetFeatures`).
 */
function assertFeatureRequirementsMet(change: Parameters<typeof newlyUnmetFeatures>[0]) {
	const [unmet] = newlyUnmetFeatures(change);
	if (!unmet) return;
	throw apiError({
		code: 'CONFLICT',
		message: m.conferenceFeatureRequirementsMissing({
			feature: featureLabel(unmet.feature),
			missing: unmet.missing.map(featureRequirementLabel).join(', ')
		})
	});
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
	schema: ConferenceSeedingSchema.superRefine((data, ctx) => {
		const icons = [
			...data.nsa.map(({ icon }, index) => ({ icon, path: ['nsa', index, 'icon'] })),
			...data.customConferenceRole.map(({ icon }, index) => ({
				icon,
				path: ['customConferenceRole', index, 'icon']
			}))
		];
		for (const { icon, path } of icons) {
			if (icon !== '' && !isPhosphorIcon(icon))
				ctx.addIssue({ code: 'custom', path, message: m.unknownIcon() });
		}
	}),
	malformed: () => m.plausibilityIncompleteOrInvalidData(),
	invalid: (details) => m.conferenceSeedingInvalid({ details })
});
type ConferenceSeedingData = z.output<typeof seedingDataSchema>;

/**
 * Seats a nation, which the seeding document names by alpha-2, in a committee: it becomes a nation
 * role of the conference (once, however many committees seat it) and is linked to the committee.
 */
async function seatNation({
	tx,
	conferenceId,
	committeeId,
	alpha2
}: {
	tx: Transaction;
	conferenceId: string;
	committeeId: string;
	alpha2: string;
}) {
	const nation = await tx.query.nation.findFirst({
		where: { alpha2Code: alpha2.toLowerCase() },
		columns: { alpha3Code: true }
	});
	if (!nation) return;
	await tx
		.insert(schema.conferenceRole)
		.values({ conferenceId, kind: 'NATION', nationAlpha3Code: nation.alpha3Code })
		.onConflictDoNothing();
	const role = await tx.query.conferenceRole
		.findFirst({
			where: { conferenceId, nationAlpha3Code: nation.alpha3Code },
			columns: { id: true }
		})
		.then(assertFindFirstExists);
	await tx
		.insert(schema.committeeToRole)
		.values({ a: committeeId, b: role.id })
		.onConflictDoNothing();
}

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

			for (const alpha2 of nations) {
				await seatNation({ tx, conferenceId: conference.id, committeeId: row.id, alpha2 });
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
