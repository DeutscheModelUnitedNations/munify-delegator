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
	const { released, changed } = await db.transaction(async (tx) => {
		const existing = await tx.query.instanceLink.findFirst({
			columns: { id: true, remoteUrl: true }
		});
		if (existing?.remoteUrl === config?.remoteUrl) return { released: [], changed: false };
		if (existing)
			await tx.delete(schema.instanceLink).where(eq(schema.instanceLink.id, existing.id));
		if (config) await tx.insert(schema.instanceLink).values({ remoteUrl: config.remoteUrl });
		return { released: existing ? await releaseResolutions(tx) : [], changed: true };
	});
	if (changed) {
		instanceLinkPubsub.removed();
		instanceLinkPubsub.created();
	}
	if (released.length > 0) resolutionPubsub.updated(released.map(({ id }) => id));
	return config;
}

function releaseResolutions(tx: Transaction) {
	return tx
		.update(schema.resolution)
		.set({ chasePaperId: null, chaseSnapshotId: null })
		.where(isNotNull(schema.resolution.chasePaperId))
		.returning({ id: schema.resolution.id });
}
