import { db, schema, type Transaction } from '#api/db/db';
import { eq, isNotNull } from 'drizzle-orm';
import { instanceLinkPubsub, resolutionPubsub } from '#api/pubsub';
import { linkConfig } from './linkAuth';

/**
 * Brings the link's row in line with the configuration (`linkAuth.ts`), at start-up: written while
 * a CHASE is configured, removed once none is. A link that ends, or points at another CHASE, lets
 * go of the resolutions it brought: they stay, as ordinary ones the team may delete. Answers the
 * configuration, undefined while there is no link.
 */
export async function syncLinkRow() {
	const config = linkConfig();
	const { released, changed } = await db.transaction((tx) =>
		replaceLinkRow({ tx, remoteUrl: config?.remoteUrl })
	);
	if (changed) {
		instanceLinkPubsub.removed();
		instanceLinkPubsub.created();
	}
	if (released.length > 0) resolutionPubsub.updated(released.map(({ id }) => id));
	return config;
}

/** Replaces the link's row by one for `remoteUrl` (none without), unless it already names it. */
async function replaceLinkRow({
	tx,
	remoteUrl
}: {
	tx: Transaction;
	remoteUrl: string | undefined;
}) {
	const existing = await tx.query.instanceLink.findFirst({
		columns: { id: true, remoteUrl: true }
	});
	if (existing?.remoteUrl === remoteUrl) return { released: [], changed: false };
	const released = existing ? await dropLinkRow({ tx, id: existing.id }) : [];
	await insertLinkRow({ tx, remoteUrl });
	return { released, changed: true };
}

/** Deletes the link's row and lets go of the resolutions it brought; answers those. */
async function dropLinkRow({ tx, id }: { tx: Transaction; id: string }) {
	await tx.delete(schema.instanceLink).where(eq(schema.instanceLink.id, id));
	return releaseResolutions(tx);
}

async function insertLinkRow({
	tx,
	remoteUrl
}: {
	tx: Transaction;
	remoteUrl: string | undefined;
}) {
	if (remoteUrl) await tx.insert(schema.instanceLink).values({ remoteUrl });
}

function releaseResolutions(tx: Transaction) {
	return tx
		.update(schema.resolution)
		.set({ chasePaperId: null, chaseSnapshotId: null })
		.where(isNotNull(schema.resolution.chasePaperId))
		.returning({ id: schema.resolution.id });
}
