import type { DB } from '../db';
import { createDefaultNationsInDatabase } from './nations';

export async function createDefaultData(db: DB) {
	const [nations] = await Promise.all([createDefaultNationsInDatabase(db)]);

	return { nations };
}
