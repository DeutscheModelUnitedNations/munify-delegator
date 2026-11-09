/**
 * Splits the e2e suite into CI shards of about equal running time.
 *
 * Playwright's own `--shard` cuts the files into runs of equal test count, which is far from equal
 * time here: `api-abilities.spec.ts` holds 27 quick tests, a registration spec one test of 45 s. So
 * one shard ran three times as long as another. This packs the spec files by the durations
 * recorded in `e2e/durations.json` instead, and prints the files of one shard for `playwright test`.
 *
 *   bun scripts/e2eShards.ts split <shard> <total>     the spec files of shard <shard> (1-based)
 *   bun scripts/e2eShards.ts record <report.json>      rewrite e2e/durations.json from a JSON report
 *
 * A spec file not recorded yet counts as the median, so a new spec lands somewhere sensible until
 * the durations are recorded again (the CI's `e2e` job uploads them as the `e2e-durations` artifact).
 */
import { Glob } from 'bun';

const DURATIONS_PATH = 'e2e/durations.json';

// Each shard runs its files on this many workers (playwright.config.ts, E2E_WORKERS).
const WORKERS = Number(process.env.E2E_WORKERS ?? 2);

type Durations = Record<string, number>;

async function specFiles() {
	const files = await Array.fromAsync(new Glob('e2e/**/*.spec.ts').scan('.'));
	return files.sort();
}

async function readDurations(): Promise<Durations> {
	const file = Bun.file(DURATIONS_PATH);
	return (await file.exists()) ? file.json() : {};
}

function median(values: number[]) {
	if (!values.length) return 1;
	const sorted = [...values].sort((a, b) => a - b);
	return sorted[Math.floor(sorted.length / 2)];
}

/**
 * How long a shard takes: its files spread over the workers, but never shorter than its longest
 * file, which runs on one worker from start to end.
 */
function shardCost(shard: { total: number; longest: number }) {
	return Math.max(shard.total / WORKERS, shard.longest);
}

/** Longest files first, each into the shard it lengthens least. */
export function splitIntoShards({
	files,
	durations,
	total
}: {
	files: string[];
	durations: Durations;
	total: number;
}) {
	const fallback = median(files.map((f) => durations[f]).filter((d) => d !== undefined));
	const weighted = files
		.map((file) => ({ file, duration: durations[file] ?? fallback }))
		.sort((a, b) => b.duration - a.duration || a.file.localeCompare(b.file));

	const shards = Array.from({ length: total }, () => ({
		files: [] as string[],
		total: 0,
		longest: 0
	}));
	for (const { file, duration } of weighted) {
		const target = shards.reduce((best, shard) => {
			const grown = shardCost({
				total: shard.total + duration,
				longest: Math.max(shard.longest, duration)
			});
			const bestGrown = shardCost({
				total: best.total + duration,
				longest: Math.max(best.longest, duration)
			});
			return grown < bestGrown ? shard : best;
		});
		target.files.push(file);
		target.total += duration;
		target.longest = Math.max(target.longest, duration);
	}
	return shards.map((shard) => shard.files.sort());
}

type ReportSuite = {
	file?: string;
	specs?: { tests: { results: { duration: number }[] }[] }[];
	suites?: ReportSuite[];
};

/** Seconds a suite's own specs took; a retried test counts its last try. */
function ownSeconds(suite: ReportSuite) {
	const tests = (suite.specs ?? []).flatMap((spec) => spec.tests);
	return tests.reduce((sum, test) => sum + (test.results.at(-1)?.duration ?? 0) / 1000, 0);
}

/** Every suite of the report with the spec file it belongs to (nested suites name none). */
function suitesWithFile({ suites, file }: { suites: ReportSuite[]; file?: string }) {
	return suites.flatMap((suite): { suite: ReportSuite; file?: string }[] => {
		const path = suite.file ?? file;
		return [{ suite, file: path }, ...suitesWithFile({ suites: suite.suites ?? [], file: path })];
	});
}

/** Seconds per spec file, from Playwright's JSON report. */
export function durationsFromReport(report: { suites: ReportSuite[] }): Durations {
	const durations = new Map<string, number>();
	for (const { suite, file } of suitesWithFile({ suites: report.suites })) {
		if (!file) continue;
		const key = `e2e/${file}`;
		durations.set(key, (durations.get(key) ?? 0) + ownSeconds(suite));
	}
	return Object.fromEntries(
		[...durations]
			.sort(([a], [b]) => a.localeCompare(b))
			.map(([file, seconds]) => [file, Math.round(seconds * 10) / 10])
	);
}

/** `<shard> <total>` as numbers, the shard 1-based and at most the total. */
function shardArgs(args: string[]) {
	const [shard, total] = args.map(Number);
	const valid = [shard, total].every(Number.isInteger) && shard >= 1 && shard <= total;
	if (!valid) throw new Error('Usage: bun scripts/e2eShards.ts split <shard> <total>');
	return { shard, total };
}

async function split(args: string[]) {
	const { shard, total } = shardArgs(args);
	const shards = splitIntoShards({
		files: await specFiles(),
		durations: await readDurations(),
		total
	});
	console.log(shards[shard - 1].join(' '));
}

async function record([reportPath]: string[]) {
	if (!reportPath) throw new Error('Usage: bun scripts/e2eShards.ts record <report.json>');
	const durations = durationsFromReport(await Bun.file(reportPath).json());
	await Bun.write(DURATIONS_PATH, `${JSON.stringify(durations, null, '\t')}\n`);
	console.log(`Recorded ${Object.keys(durations).length} spec files in ${DURATIONS_PATH}`);
}

const COMMANDS: Record<string, (args: string[]) => Promise<void>> = { split, record };

async function main() {
	const [command, ...args] = process.argv.slice(2);
	const run = COMMANDS[command];
	if (!run) {
		throw new Error('Usage: bun scripts/e2eShards.ts split <shard> <total> | record <report.json>');
	}
	await run(args);
}

if (import.meta.main) await main();
