import { db, schema } from '#api/db/db';
import { and, eq, lt, sql } from 'drizzle-orm';
import { conferenceParticipantPubsub } from '#api/pubsub';
import { apiError } from '#api/services/errors';
import { identityCardExpiry, MAX_CARD_NUMBER } from '#lib/helpers/identityCode';
import { m } from '#lib/paraglide/messages';
import { issueIdentityCard } from '#api/handlers/identityCode/identityKeyPair';

/**
 * Printed NSA cards (`docs/plans/chase-link.md`): a signed card code per member of a non-state
 * actor delegation, good at their conference until the day after it ends, with the name printed
 * beside it so a chair can find the person by name when the code does not scan.
 */

/**
 * The cards of a conference's NSA delegates, all of them or those of the given participant rows,
 * signed as they are now. Signing writes nothing: the same card comes out again until its number
 * is raised (`raiseNsaCardNumber`).
 */
export async function nsaCards({
	conferenceId,
	conferenceParticipantIds
}: {
	conferenceId: string;
	conferenceParticipantIds?: readonly string[] | null;
}) {
	const conference = await db.query.conference.findFirst({
		where: { id: conferenceId },
		columns: { endConference: true }
	});
	if (!conference) return [];
	const members = await db.query.delegationMember.findMany({
		where: {
			delegation: { conferenceId, assignedRole: { kind: 'NON_STATE_ACTOR' } },
			...(conferenceParticipantIds
				? { conferenceParticipantId: { in: [...conferenceParticipantIds] } }
				: {})
		},
		columns: {},
		with: {
			participant: {
				columns: { id: true, userId: true, nsaCardNumber: true },
				with: { user: { columns: { givenName: true, familyName: true } } }
			},
			delegation: {
				columns: {},
				with: { assignedRole: { columns: { name: true, fontAwesomeIcon: true } } }
			}
		}
	});
	const expiresAtSeconds = identityCardExpiry(conference.endConference);
	const cards = await Promise.all(
		members.map(async ({ participant, delegation }) => ({
			conferenceParticipantId: participant.id,
			givenName: participant.user.givenName,
			familyName: participant.user.familyName,
			nsaName: delegation.assignedRole?.name ?? null,
			nsaIcon: delegation.assignedRole?.fontAwesomeIcon ?? null,
			cardNumber: participant.nsaCardNumber,
			code: await issueIdentityCard({
				userId: participant.userId,
				conferenceId,
				expiresAtSeconds,
				cardNumber: participant.nsaCardNumber
			})
		}))
	);
	return cards.toSorted(
		(a, b) =>
			(a.nsaName ?? '').localeCompare(b.nsaName ?? '') ||
			a.familyName.localeCompare(b.familyName) ||
			a.givenName.localeCompare(b.givenName)
	);
}

/**
 * Raises a participant's card number, so the cards printed before stop counting, and answers the
 * new card. NOT_FOUND for someone who is no NSA delegate, CONFLICT once the numbers run out.
 */
export async function reprintNsaCard({
	conferenceId,
	conferenceParticipantId
}: {
	conferenceId: string;
	conferenceParticipantId: string;
}) {
	const [current] = await nsaCards({
		conferenceId,
		conferenceParticipantIds: [conferenceParticipantId]
	});
	if (!current) throw apiError({ code: 'NOT_FOUND', message: m.nsaCardNoNsa() });
	const raised = await db
		.update(schema.conferenceParticipant)
		.set({ nsaCardNumber: sql`${schema.conferenceParticipant.nsaCardNumber} + 1` })
		.where(
			and(
				eq(schema.conferenceParticipant.id, conferenceParticipantId),
				lt(schema.conferenceParticipant.nsaCardNumber, MAX_CARD_NUMBER)
			)
		)
		.returning({ id: schema.conferenceParticipant.id });
	if (raised.length === 0) {
		throw apiError({ code: 'CONFLICT', message: m.nsaCardNumberExhausted() });
	}
	conferenceParticipantPubsub.updated(conferenceParticipantId);
	const [card] = await nsaCards({
		conferenceId,
		conferenceParticipantIds: [conferenceParticipantId]
	});
	if (!card) throw apiError({ code: 'NOT_FOUND', message: m.nsaCardNoNsa() });
	return card;
}
