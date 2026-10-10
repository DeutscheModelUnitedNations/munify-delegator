import anyAscii from 'any-ascii';

export interface SchoolVariant {
	school: string;
	sumParticipants: number;
}

export interface SchoolSuggestion {
	/** Variants of what looks like one school, the most used spelling first. */
	variants: SchoolVariant[];
	/** The lowest pairwise similarity that joined them, in [0, 1]. */
	similarity: number;
}

const SIMILARITY_THRESHOLD = 0.86;
/** A word shared by more schools than this is no use for finding candidates ("Gymnasium"). */
const MAX_BLOCK_SIZE = 60;
const MIN_TOKEN_LENGTH = 4;

function normalizeSchoolName(name: string): string {
	return anyAscii(name)
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, ' ')
		.trim();
}

function levenshtein(a: string, b: string): number {
	let previous = Array.from({ length: b.length + 1 }, (_, i) => i);
	for (let i = 1; i <= a.length; i++) {
		const current = [i];
		for (let j = 1; j <= b.length; j++) {
			current[j] = Math.min(
				previous[j] + 1,
				current[j - 1] + 1,
				previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
			);
		}
		previous = current;
	}
	return previous[b.length];
}

function ratio(a: string, b: string): number {
	const longest = Math.max(a.length, b.length);
	if (longest === 0) return 0;
	if (Math.abs(a.length - b.length) / longest > 1 - SIMILARITY_THRESHOLD) return 0;
	return 1 - levenshtein(a, b) / longest;
}

function sortedTokens(normalized: string): string {
	return normalized.split(' ').sort().join(' ');
}

function similarity(a: string, b: string): number {
	return Math.max(ratio(a, b), ratio(sortedTokens(a), sortedTokens(b)));
}

/** Indexes schools by the words they share, so only names with a distinctive word are compared. */
function blockByToken(normalized: readonly string[]): Map<string, number[]> {
	const blocks = new Map<string, number[]>();
	normalized.forEach((name, index) => {
		const keys = new Set([name, ...name.split(' ').filter((t) => t.length >= MIN_TOKEN_LENGTH)]);
		for (const key of keys) {
			const block = blocks.get(key);
			if (block) block.push(index);
			else blocks.set(key, [index]);
		}
	});
	return blocks;
}

/** Every unordered pair inside the blocks that is small enough to be worth comparing, once. */
function* candidatePairs(
	blocks: Map<string, number[]>,
	total: number
): Generator<[number, number]> {
	const seen = new Set<number>();
	for (const block of blocks.values()) {
		if (block.length < 2 || block.length > MAX_BLOCK_SIZE) continue;
		for (let x = 0; x < block.length; x++) {
			for (let y = x + 1; y < block.length; y++) {
				const pair = block[x] * total + block[y];
				if (seen.has(pair)) continue;
				seen.add(pair);
				yield [block[x], block[y]];
			}
		}
	}
}

/**
 * Groups school names that most likely denote the same school: spelling, casing, punctuation,
 * umlauts, word order and small typos. Only names sharing a distinctive word are compared, so
 * thousands of schools stay cheap.
 */
export function findSimilarSchools(schools: readonly SchoolVariant[]): SchoolSuggestion[] {
	const normalized = schools.map((s) => normalizeSchoolName(s.school));
	const parent = schools.map((_, i) => i);
	const find = (i: number): number => (parent[i] === i ? i : (parent[i] = find(parent[i])));
	const lowest = new Map<number, number>();

	for (const [i, j] of candidatePairs(blockByToken(normalized), schools.length)) {
		const score = similarity(normalized[i], normalized[j]);
		if (score < SIMILARITY_THRESHOLD) continue;
		const [ri, rj] = [find(i), find(j)];
		parent[ri] = rj;
		const root = find(j);
		const previous = Math.min(lowest.get(ri) ?? 1, lowest.get(rj) ?? 1, lowest.get(root) ?? 1);
		lowest.set(root, Math.min(previous, score));
	}

	const groups = new Map<number, SchoolVariant[]>();
	schools.forEach((school, i) => {
		const root = find(i);
		groups.set(root, [...(groups.get(root) ?? []), school]);
	});

	return [...groups.entries()]
		.filter(([, variants]) => variants.length > 1)
		.map(([root, variants]) => ({
			variants: variants.toSorted((a, b) => b.sumParticipants - a.sumParticipants),
			similarity: lowest.get(root) ?? 1
		}))
		.sort((a, b) => b.similarity - a.similarity || b.variants.length - a.variants.length);
}

/** Identifies a group for dismissal: its sorted names as JSON, safe for a text column. */
export function suggestionKey(names: readonly string[]): string {
	return JSON.stringify(names.toSorted());
}
