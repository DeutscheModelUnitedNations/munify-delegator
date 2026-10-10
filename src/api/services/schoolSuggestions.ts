import { db, schema } from '$api/db/db';
import type { ApiContext } from '$api/rumble';
import { schoolRows } from '$api/services/conferenceAggregates';
import { findSimilarSchools, suggestionKey } from '$api/services/similarSchools';
import { eq, inArray } from 'drizzle-orm';

/** Applied registrations the caller may read, grouped by the school they named. */
export async function loadSchoolRows(conferenceId: string, ctx: ApiContext) {
	const [delegations, participants] = await Promise.all([
		db.query.delegation.findMany(
			(await ctx.abilities.delegation.filter('read')).merge({
				where: { conferenceId, applied: true, school: { isNotNull: true } }
			}).query.many
		),
		db.query.singleParticipant.findMany(
			(await ctx.abilities.singleParticipant.filter('read')).merge({
				where: { conferenceId, applied: true, school: { isNotNull: true } }
			}).query.many
		)
	]);

	const memberCounts = await db.query.delegationMember.findMany({
		where: { delegation: { conferenceId, applied: true } },
		columns: { delegationId: true }
	});

	return schoolRows(delegations, memberCounts, participants);
}

/**
 * Finds the groups of similar school names in a conference and brings the suggestion tables in
 * line with them. A group found again keeps its row, and so the team's decision; groups that no
 * longer exist (merged, renamed, withdrawn) are removed.
 */
export async function refreshSchoolSuggestions(conferenceId: string, ctx: ApiContext) {
	const found = findSimilarSchools(await loadSchoolRows(conferenceId, ctx)).map((suggestion) => ({
		...suggestion,
		key: suggestionKey(suggestion.variants.map((variant) => variant.school))
	}));

	await db.transaction(async (tx) => {
		const existing = await tx
			.select({ id: schema.schoolSuggestion.id, key: schema.schoolSuggestion.key })
			.from(schema.schoolSuggestion)
			.where(eq(schema.schoolSuggestion.conferenceId, conferenceId));

		const foundKeys = new Set(found.map((suggestion) => suggestion.key));
		const stale = existing.filter((row) => !foundKeys.has(row.key)).map((row) => row.id);
		if (stale.length > 0) {
			await tx.delete(schema.schoolSuggestion).where(inArray(schema.schoolSuggestion.id, stale));
		}

		const idByKey = new Map(existing.map((row) => [row.key, row.id]));
		const fresh = found.filter((suggestion) => !idByKey.has(suggestion.key));
		if (fresh.length > 0) {
			const inserted = await tx
				.insert(schema.schoolSuggestion)
				.values(
					fresh.map((suggestion) => ({
						conferenceId,
						key: suggestion.key,
						similarity: suggestion.similarity
					}))
				)
				.returning({ id: schema.schoolSuggestion.id, key: schema.schoolSuggestion.key });
			for (const row of inserted) idByKey.set(row.key, row.id);
		}

		for (const suggestion of found.filter((s) => !fresh.includes(s))) {
			await tx
				.update(schema.schoolSuggestion)
				.set({ similarity: suggestion.similarity })
				.where(eq(schema.schoolSuggestion.id, idByKey.get(suggestion.key) ?? ''));
		}

		// The counts change whenever registrations do, so every group's variants are rewritten.
		const ids = [...idByKey.entries()].filter(([key]) => foundKeys.has(key)).map(([, id]) => id);
		if (ids.length > 0) {
			await tx
				.delete(schema.schoolSuggestionVariant)
				.where(inArray(schema.schoolSuggestionVariant.suggestionId, ids));
			await tx.insert(schema.schoolSuggestionVariant).values(
				found.flatMap((suggestion) =>
					suggestion.variants.map((variant) => ({
						suggestionId: idByKey.get(suggestion.key) ?? '',
						school: variant.school,
						sumParticipants: variant.sumParticipants
					}))
				)
			);
		}
	});
}
