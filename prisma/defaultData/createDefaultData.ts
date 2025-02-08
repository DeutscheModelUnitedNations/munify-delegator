import type { DB } from '../db';
import { createDefaultNationsInDatabase } from './nations';

export async function createDefaultData(db: DB) {
	return Promise.all([createDefaultNationsInDatabase(db)]);
}
