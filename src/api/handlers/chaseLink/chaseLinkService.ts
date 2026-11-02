import { db, schema } from '#api/db/db';
import { and, eq } from 'drizzle-orm';
import { apiError } from '#api/services/errors';
import { instanceLinkPubsub } from '#api/pubsub';
import { logger } from '#lib/logger';
import { m } from '#lib/paraglide/messages';
import { createChaseClient } from './chaseRemote';
import {
	hashLinkToken,
	makeConfirmationCode,
	makeLinkToken,
	openLinkToken,
	sealLinkToken
} from './linkTokens';

/**
 * Pairing with a CHASE instance (`docs/plans/chase-link.md`): this instance asks with the token
 * CHASE will call it with, a CHASE admin approves, and CHASE confirms with its own token. Only one
 * link at a time; a frozen one is replaced by the next request.
 */

export async function requestChaseLink({
	chaseUrl,
	ownUrl
}: {
	chaseUrl: string;
	/** Where CHASE reaches this instance: the origin of the request asking. */
	ownUrl: string;
}) {
	const token = makeLinkToken();
	const confirmationCode = makeConfirmationCode();

	const { id, removedId } = await db.transaction(async (tx) => {
		const existing = await tx.query.instanceLink.findFirst({ columns: { id: true, status: true } });
		if (existing && existing.status !== 'FROZEN') {
			throw apiError({ code: 'CONFLICT', message: m.chaseLinkExists() });
		}
		if (existing)
			await tx.delete(schema.instanceLink).where(eq(schema.instanceLink.id, existing.id));
		const [row] = await tx
			.insert(schema.instanceLink)
			.values({
				remoteUrl: chaseUrl,
				inboundTokenHash: hashLinkToken(token),
				confirmationCode
			})
			.returning({ id: schema.instanceLink.id });
		return { id: row.id, removedId: existing?.id };
	});

	const remote = createChaseClient({ url: chaseUrl });
	try {
		await remote.mutate.requestDelegatorLink({
			__args: { delegatorUrl: ownUrl, token, confirmationCode }
		});
	} catch (error) {
		logger.warn('CHASE refused or did not answer the link request', { error, chaseUrl });
		await db.delete(schema.instanceLink).where(eq(schema.instanceLink.id, id));
		throw apiError({ code: 'CONFLICT', message: m.chaseLinkUnreachable() });
	} finally {
		remote.dispose();
	}

	if (removedId) instanceLinkPubsub.removed();
	instanceLinkPubsub.created();
	return id;
}

/** CHASE approved: it hands over the token this instance calls it with. */
export async function confirmChaseLink({
	linkId,
	confirmationCode,
	token
}: {
	linkId: string;
	confirmationCode: string;
	token: string;
}) {
	const confirmed = await db
		.update(schema.instanceLink)
		.set({
			status: 'ACTIVE',
			outboundToken: sealLinkToken(token),
			linkedAt: new Date(),
			lastError: null
		})
		.where(
			and(
				eq(schema.instanceLink.id, linkId),
				eq(schema.instanceLink.status, 'PENDING'),
				eq(schema.instanceLink.confirmationCode, confirmationCode)
			)
		)
		.returning({ id: schema.instanceLink.id });
	if (confirmed.length === 0) {
		throw apiError({ code: 'CONFLICT', message: m.chaseLinkNotPending() });
	}
	instanceLinkPubsub.updated(linkId);
}

/**
 * Ends the link: CHASE's token stops working and both sides keep what they have. Tells CHASE
 * when the unlinking started here.
 */
export async function freezeChaseLink({ notifyRemote }: { notifyRemote: boolean }) {
	const link = await db.query.instanceLink.findFirst({ where: { status: { ne: 'FROZEN' } } });
	if (!link) throw apiError({ code: 'NOT_FOUND', message: m.chaseLinkNone() });

	if (notifyRemote && link.status === 'ACTIVE' && link.outboundToken) {
		const remote = createChaseClient({
			url: link.remoteUrl,
			token: openLinkToken(link.outboundToken)
		});
		await Promise.resolve(remote.mutate.unlinkDelegator())
			.catch((error) => logger.warn('CHASE did not hear of the unlinking', { error }))
			.finally(() => remote.dispose());
	}

	if (link.status === 'PENDING') {
		await db.delete(schema.instanceLink).where(eq(schema.instanceLink.id, link.id));
		instanceLinkPubsub.removed();
		return;
	}
	await db
		.update(schema.instanceLink)
		.set({ status: 'FROZEN', outboundToken: null })
		.where(eq(schema.instanceLink.id, link.id));
	instanceLinkPubsub.updated(link.id);
}
