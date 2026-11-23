import { z } from 'zod';
import type { FieldReading } from '../readPaper';

/**
 * A page scanned again. The code printed on a page is that page's alone (`pageKeyOf`), so it is told
 * whatever file or stack it comes in. Scanned a second time it is kept only if it says more: the paper
 * was signed since, or the first scan was too poor to read.
 */

/** What became of a page: kept, kept in place of an earlier scan of it, or left for it. */
export const keptOutcomeSchema = z.enum(['stored', 'replaced', 'known', 'differs']);
export type KeptOutcome = z.infer<typeof keptOutcomeSchema>;

/** What was read off a page, as it is stored; `null` when its fields were not readable. */
export type StoredReadings = { field: string; state: FieldReading['state'] }[] | null;

/** Whether a field read `before` and now says something else, and which says more. */
function compareStates({
	before,
	now
}: {
	before: FieldReading['state'];
	now: FieldReading['state'];
}) {
	if (before === now || now === 'unclear') return 'same';
	if (before === 'yes') return 'worse';
	return 'better';
}

/**
 * What to do with a page read as `readings`, given the scan of it kept already (`known`, if any):
 * `differs` when something there before is missing now, which a person looks at (the kept one stays).
 */
export function judgeRescan({
	known,
	readings
}: {
	known: { readings: StoredReadings } | undefined;
	readings: StoredReadings;
}): KeptOutcome {
	if (!known) return 'stored';
	if (readings === null) return 'known';
	if (known.readings === null) return 'replaced';
	const before = new Map(known.readings.map(({ field, state }) => [field, state]));
	const compared = readings.map(({ field, state }) => {
		const earlier = before.get(field);
		return earlier === undefined ? 'same' : compareStates({ before: earlier, now: state });
	});
	if (compared.includes('worse')) return 'differs';
	return compared.includes('better') ? 'replaced' : 'known';
}
