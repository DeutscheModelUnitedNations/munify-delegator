import { z } from 'zod';
import { db, schema } from '#api/db/db';
import { assertFirstEntryExists } from '@m1212e/rumble';
import { whereRows } from '#api/db/whereRows';
import { m } from '#lib/paraglide/messages';
import { apiError, isUniqueViolationOn } from '#api/services/errors';
import { reviewerSnippetPubsub } from '#api/pubsub';

type SnippetContent = (typeof schema.reviewerSnippet.$inferInsert)['content'];

/** A snippet's name as stored, trimmed; it is what the editor's slash command matches. */
export const snippetNameSchema = z
	.string()
	.trim()
	.min(1, { error: () => m.snippetNameRequired() });

/** Turns the unique index on a reviewer's snippet names into a CONFLICT. */
async function refusingTakenName<T>(write: Promise<T>) {
	try {
		return await write;
	} catch (error) {
		if (isUniqueViolationOn({ error, column: 'name' })) {
			throw apiError({ code: 'CONFLICT', message: m.snippetNameTaken() });
		}
		throw error;
	}
}

/** Saves a snippet of the user; a name they already use is refused (CONFLICT). Returns its id. */
export async function createSnippet({
	userId,
	name,
	content
}: {
	userId: string;
	name: string;
	content: SnippetContent;
}) {
	const { id } = await refusingTakenName(
		db
			.insert(schema.reviewerSnippet)
			.values({ name, content, userId })
			.returning({ id: schema.reviewerSnippet.id })
			.then(assertFirstEntryExists)
	);
	reviewerSnippetPubsub.created();
	return id;
}

/**
 * Changes the given fields of a snippet; the others stay as they are. A name its owner already
 * uses for another snippet is refused (CONFLICT).
 */
export async function updateSnippet({
	id,
	changes
}: {
	id: string;
	changes: { name?: string; content?: SnippetContent };
}) {
	await refusingTakenName(
		db
			.update(schema.reviewerSnippet)
			.set({ ...changes, updatedAt: new Date() })
			.where(whereRows({ table: schema.reviewerSnippet, filter: { id } }))
	);
	reviewerSnippetPubsub.updated(id);
}
