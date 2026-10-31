import { db, schema } from '#api/db/db';
import type { ReadableSchoolRegistrations } from './schoolSuggestionPermissions';
import { schoolRows } from './conferenceAggregates';
import { findSimilarSchools, suggestionKey } from './similarSchools';
import { eq } from 'drizzle-orm';
import { whereRows } from '#api/db/whereRows';

/**
 * The people of applied registrations the caller may read (`readableSchoolRegistrations`), grouped
 * by their own school.
 */
export async function loadSchoolRows(readable: ReadableSchoolRegistrations) {
	const school = { id: schema.school.id, name: schema.school.name };
	const [members, singleParticipants] = await Promise.all([
		db
			.select({ delegationId: schema.delegationMember.delegationId, school })
			.from(schema.delegationMember)
			.innerJoin(schema.delegation, eq(schema.delegation.id, schema.delegationMember.delegationId))
			.innerJoin(
				schema.conferenceParticipant,
				eq(schema.conferenceParticipant.id, schema.delegationMember.conferenceParticipantId)
			)
			.innerJoin(schema.school, eq(schema.school.id, schema.conferenceParticipant.schoolId))
			.where(readable.delegations),
		db
			.select({ school })
			.from(schema.singleParticipant)
			.innerJoin(
				schema.conferenceParticipant,
				eq(schema.conferenceParticipant.id, schema.singleParticipant.conferenceParticipantId)
			)
			.innerJoin(schema.school, eq(schema.school.id, schema.conferenceParticipant.schoolId))
			.where(readable.singleParticipants)
	]);

	return schoolRows({ members, singleParticipants });
}

/**
 * Finds the groups of similar schools among those the applicants of a conference name and brings the suggestion tables in
 * line with them. A group found again keeps its row, and so the team's decision; groups that no
 * longer exist (merged, renamed, withdrawn) are removed.
 */
export async function refreshSchoolSuggestions({
	conferenceId,
	readable
}: {
	conferenceId: string;
	readable: ReadableSchoolRegistrations;
}) {
	const found = findSimilarSchools(await loadSchoolRows(readable)).map((suggestion) => ({
		...suggestion,
		key: suggestionKey(suggestion.variants.map((variant) => variant.schoolId))
	}));

	await db.transaction(async (tx) => {
		const existing = await tx.query.schoolSuggestion.findMany({
			where: { conferenceId },
			columns: { id: true, key: true }
		});

		const foundKeys = new Set(found.map((suggestion) => suggestion.key));
		const stale = existing.filter((row) => !foundKeys.has(row.key)).map((row) => row.id);
		if (stale.length > 0) {
			await tx
				.delete(schema.schoolSuggestion)
				.where(whereRows({ table: schema.schoolSuggestion, filter: { id: { in: stale } } }));
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
				.where(
					whereRows({
						table: schema.schoolSuggestion,
						filter: { id: idByKey.get(suggestion.key) ?? '' }
					})
				);
		}

		// The counts change whenever registrations do, so every group's variants are rewritten.
		const ids = [...idByKey.entries()].filter(([key]) => foundKeys.has(key)).map(([, id]) => id);
		if (ids.length > 0) {
			await tx.delete(schema.schoolSuggestionVariant).where(
				whereRows({
					table: schema.schoolSuggestionVariant,
					filter: { suggestionId: { in: ids } }
				})
			);
			await tx.insert(schema.schoolSuggestionVariant).values(
				found.flatMap((suggestion) =>
					suggestion.variants.map((variant) => ({
						suggestionId: idByKey.get(suggestion.key) ?? '',
						schoolId: variant.schoolId,
						sumParticipants: variant.sumParticipants
					}))
				)
			);
		}
	});
}
