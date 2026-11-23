import { and, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import { db, schema, type Transaction } from '#api/db/db';
import { agreementDetailPubsub, conferenceParticipantPubsub } from '#api/pubsub';
import { ofAgeAtConference } from '#lib/helpers/ageChecker';
import { m } from '#lib/paraglide/messages';
import { planDetails, type AgreementField } from '#lib/paperScan/agreementDetails';
import { PAPER_FIELDS } from '#lib/paperScan/fields';
import {
	changesAnything,
	proposePaperChange,
	type PaperChange,
	type PaperNote
} from '#lib/paperScan/proposal';
import type { FieldReading, FieldState } from '#lib/paperScan/readPaper';

/** More than every field of every document, each read on a few copies. */
const MAX_READINGS = 500;

/** The fields read off a person's pages, as a client sends them. */
export const paperReadingsSchema = z
	.array(
		z.object({
			field: z.enum(Object.keys(PAPER_FIELDS), { error: () => m.paperFieldUnknown() }),
			state: z.enum(['yes', 'no', 'unclear'])
		})
	)
	.max(MAX_READINGS);

const isPaperField = (field: string): field is FieldReading['field'] =>
	Object.hasOwn(PAPER_FIELDS, field);

/** The readings of fields this version knows. */
export const knownReadings = (
	readings: readonly { field: string; state: FieldState }[]
): FieldReading[] =>
	readings.flatMap(({ field, state }) => (isPaperField(field) ? [{ field, state }] : []));

/** A participant's row locked, so two deliveries of their pages are taken in one after the other. */
async function lockParticipant({ tx, participantId }: { tx: Transaction; participantId: string }) {
	await tx
		.select({ id: schema.conferenceParticipant.id })
		.from(schema.conferenceParticipant)
		.where(eq(schema.conferenceParticipant.id, participantId))
		.for('update');
	return tx.query.conferenceParticipant.findFirst({
		where: { id: participantId },
		columns: {
			termsAndConditions: true,
			guardianConsent: true,
			mediaConsent: true,
			mediaConsentStatus: true
		},
		with: {
			user: { columns: { birthday: true } },
			conference: { columns: { startConference: true } },
			agreementDetails: { columns: { field: true, state: true, source: true } }
		}
	});
}

/** Writes details read off a scan; what a person set stays. Answers the ids of the rows. */
async function writeScanned({
	tx,
	participantId,
	details
}: {
	tx: Transaction;
	participantId: string;
	details: readonly { field: AgreementField; state: FieldState }[];
}) {
	if (details.length === 0) return [];
	const table = schema.agreementDetail;
	const rows = await tx
		.insert(table)
		.values(
			details.map(({ field, state }) => ({
				conferenceParticipantId: participantId,
				field,
				state,
				source: 'SCAN' as const
			}))
		)
		.onConflictDoUpdate({
			target: [table.conferenceParticipantId, table.field],
			set: { state: sql`excluded.state`, updatedAt: new Date() },
			setWhere: ne(table.source, 'MANUAL')
		})
		.returning({ id: table.id });
	return rows.map(({ id }) => id);
}

function announceDetails(ids: readonly string[]) {
	if (ids.length === 0) return;
	agreementDetailPubsub.created();
	agreementDetailPubsub.updated([...ids]);
}

/**
 * Takes in what a person's scanned pages say: the details, and the statuses they make
 * (`proposePaperChange`), together. `confirm`: a person looked at it. Answers what changed and why
 * anything was left.
 */
export async function applyPaperReadings({
	participantId,
	readings,
	confirm
}: {
	participantId: string;
	readings: readonly FieldReading[];
	confirm: boolean;
}): Promise<{ change: PaperChange; notes: PaperNote[] }> {
	if (readings.length === 0) return { change: {}, notes: [] };
	const { proposal, written, differing } = await db.transaction(async (tx) => {
		const participant = await lockParticipant({ tx, participantId });
		if (!participant) return { proposal: { change: {}, notes: [] }, written: [], differing: [] };
		const { user, conference, agreementDetails, ...status } = participant;
		const proposal = proposePaperChange({
			readings,
			known: agreementDetails,
			status,
			confirm,
			// without a birthday nobody is taken for a minor
			minor:
				!!user.birthday &&
				!ofAgeAtConference({
					startConference: conference.startConference,
					dateOfBirth: user.birthday
				})
		});
		const plan = planDetails({ readings, stored: agreementDetails, confirm });
		const written = await writeScanned({ tx, participantId, details: plan.write });
		if (changesAnything(proposal.change)) {
			await tx
				.update(schema.conferenceParticipant)
				.set({ ...proposal.change, updatedAt: new Date() })
				.where(eq(schema.conferenceParticipant.id, participantId));
		}
		return { proposal, written, differing: plan.differing };
	});
	announceDetails(written);
	if (changesAnything(proposal.change)) conferenceParticipantPubsub.updated(participantId);
	const differs = differing.map((field) => ({ kind: 'detailDiffers' as const, field }));
	return { change: proposal.change, notes: [...proposal.notes, ...differs] };
}

/**
 * Sets one detail by hand, which no scan changes from then on; `null` takes it back, and scans fill
 * it in again.
 */
export async function setAgreementDetail({
	participantId,
	field,
	state
}: {
	participantId: string;
	field: AgreementField;
	state: FieldState | null;
}) {
	const table = schema.agreementDetail;
	if (state === null) {
		await db
			.delete(table)
			.where(and(eq(table.conferenceParticipantId, participantId), eq(table.field, field)));
		agreementDetailPubsub.removed();
		return;
	}
	const rows = await db
		.insert(table)
		.values({ conferenceParticipantId: participantId, field, state, source: 'MANUAL' })
		.onConflictDoUpdate({
			target: [table.conferenceParticipantId, table.field],
			set: { state, source: 'MANUAL', updatedAt: new Date() }
		})
		.returning({ id: table.id });
	announceDetails(rows.map(({ id }) => id));
}
