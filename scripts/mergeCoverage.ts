#!/usr/bin/env bun
/**
 * Merges every coverage report the test runs leave behind into `coverage/coverage-final.json`,
 * the one Istanbul file `fallow health --coverage` reads to score functions by real coverage
 * rather than estimating it, and renders the result to `coverage/report/`:
 *
 * - `coverage/unit/` - vitest (`bun run coverage`), and `coverage/unit-<name>/` from partial runs
 *   (`vitest run --coverage --coverage.reportsDirectory=coverage/unit-<name> <files>`)
 * - `coverage/e2e-server/` - the server under the e2e suite (`bun run test:e2e:coverage`)
 * - `coverage/e2e-browser/` - the browser under the same suite, one file per Playwright worker
 *
 * Whichever exist are merged, so either run alone is enough to refresh the result, and with none
 * the output is an empty report, which fallow reads as "no coverage measured" and estimates.
 *
 * Reports of one kind are merged as Istanbul merges them. Across kinds that does not work: vitest
 * records a multi-line statement once, v8-to-istanbul (both e2e kinds, each over its own
 * transform) records one statement per line, so a plain merge lays e2e's "line 71 never ran" next
 * to vitest's "the statement on lines 70-80 ran" and a fully unit-tested function reads as mostly
 * uncovered. Instead every function keeps the statements and branches of whichever kind covers it
 * best, which never claims more coverage than one kind measured.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import libCoverage, { type FileCoverageData, type Range } from 'istanbul-lib-coverage';
import libReport from 'istanbul-lib-report';
import reports from 'istanbul-reports';
import { isMeasured } from './coverageScope';

const OUT_DIR = 'coverage';
mkdirSync(OUT_DIR, { recursive: true });

/** Every JSON report directly in `dir`, or none if it does not exist. */
const reportsIn = (dir: string) =>
	existsSync(dir)
		? readdirSync(dir)
				.filter((file) => file.endsWith('.json'))
				.map((file) => join(dir, file))
		: [];

/** The reports of each kind; reports of one kind come from the same instrumenter and transform. */
const kinds = [
	// `unit/`, and any `unit-<name>/` a partial run wrote with `--coverage.reportsDirectory`
	readdirSync(OUT_DIR, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && /^unit(-.+)?$/.test(entry.name))
		.map((entry) => join(OUT_DIR, entry.name, 'coverage-final.json')),
	['coverage/e2e-server/coverage-final.json'],
	reportsIn('coverage/e2e-browser')
].map((paths) => paths.filter((path) => existsSync(path)));

/** One kind's reports merged into one map, limited to the files coverage is measured for. */
function mergeKind(paths: string[]) {
	const map = libCoverage.createCoverageMap({});
	for (const path of paths) {
		const report = libCoverage.createCoverageMap(JSON.parse(readFileSync(path, 'utf8')));
		// Before merging: Paraglide's generated messages alone would take minutes to merge
		report.filter((file) => isMeasured(file, process.cwd()));
		map.merge(report);
	}
	return map;
}

type Located = { range: Range; count: number };
type FunctionEntry = Located & { fn: FileCoverageData['fnMap'][string] };

/** Counts one report's function in, under its declaration line. */
function addFunction(byLine: Map<number, FunctionEntry>, fn: FunctionEntry['fn'], count: number) {
	const known = byLine.get(fn.decl.start.line);
	if (known) known.count += count;
	// From the declaration, not the body: a signature spanning lines belongs to its function
	else
		byLine.set(fn.decl.start.line, { fn, range: { start: fn.decl.start, end: fn.loc.end }, count });
}

/** Each kind's functions, one per declaration line (the kinds differ in columns), counts summed. */
function functionsOf(files: FileCoverageData[]) {
	const byLine = new Map<number, FunctionEntry>();
	for (const file of files) {
		for (const [id, fn] of Object.entries(file.fnMap)) addFunction(byLine, fn, file.f[id]);
	}
	return [...byLine.values()];
}

/** The innermost function holding `line`, as an index into `functions`, or -1 at the top level. */
function ownerOf(line: number, functions: Located[]) {
	const holding = [...functions.entries()].filter(
		([, { range }]) => range.start.line <= line && line <= range.end.line
	);
	// Nested functions start later than the ones around them
	return holding.reduce(
		(owner, [index, { range }]) =>
			owner < 0 || range.start.line >= functions[owner].range.start.line ? index : owner,
		-1
	);
}

type Piece = {
	statements: Located[];
	branches: [FileCoverageData['branchMap'][string], number[]][];
};

/** One kind's statements and branches of a file, grouped by the function that owns them. */
function piecesOf(file: FileCoverageData, functions: Located[]) {
	const pieces = new Map<number, Piece>();
	const pieceFor = (line: number) => {
		const owner = ownerOf(line, functions);
		const piece = pieces.get(owner) ?? { statements: [], branches: [] };
		pieces.set(owner, piece);
		return piece;
	};
	for (const [id, range] of Object.entries(file.statementMap)) {
		pieceFor(range.start.line).statements.push({ range, count: file.s[id] });
	}
	for (const [id, branch] of Object.entries(file.branchMap)) {
		pieceFor(branch.loc.start.line).branches.push([branch, file.b[id]]);
	}
	return pieces;
}

/** The share of a piece's statements that ran. */
const coveredShare = ({ statements }: Piece) =>
	statements.filter(({ count }) => count > 0).length / Math.max(statements.length, 1);

/** Of the kinds' pieces for one function, the best covered. */
const bestPiece = (candidates: Piece[]) =>
	candidates.reduce((best, piece) => (coveredShare(piece) > coveredShare(best) ? piece : best));

/** Appends a piece's statements and branches to `merged`, numbering them on. */
function appendPiece(merged: FileCoverageData, { statements, branches }: Piece) {
	for (const { range, count } of statements) {
		const id = String(Object.keys(merged.s).length);
		merged.statementMap[id] = range;
		merged.s[id] = count;
	}
	for (const [branch, counts] of branches) {
		const id = String(Object.keys(merged.b).length);
		merged.branchMap[id] = branch;
		merged.b[id] = counts;
	}
}

/** One file's coverage across all kinds that measured it. */
function mergeFile(path: string, files: FileCoverageData[]): FileCoverageData {
	const functions = functionsOf(files);
	const kindPieces = files.map((file) => piecesOf(file, functions));
	const owners = new Set(kindPieces.flatMap((pieces) => [...pieces.keys()]));
	const merged: FileCoverageData = {
		path,
		statementMap: {},
		s: {},
		fnMap: Object.fromEntries(functions.map(({ fn }, index) => [String(index), fn])),
		f: Object.fromEntries(functions.map(({ count }, index) => [String(index), count])),
		branchMap: {},
		b: {}
	};
	for (const owner of owners) {
		appendPiece(merged, bestPiece(kindPieces.flatMap((pieces) => pieces.get(owner) ?? [])));
	}
	return merged;
}

const kindMaps = kinds.map(mergeKind);
const paths = [...new Set(kindMaps.flatMap((map) => map.files()))];
const merged = Object.fromEntries(
	paths.map((path) => [
		path,
		mergeFile(
			path,
			kindMaps.flatMap((map) =>
				map.files().includes(path) ? [map.fileCoverageFor(path).toJSON()] : []
			)
		)
	])
);
writeFileSync(join(OUT_DIR, 'coverage-final.json'), JSON.stringify(merged));

const coverageMap = libCoverage.createCoverageMap(merged);
const context = libReport.createContext({ dir: join(OUT_DIR, 'report'), coverageMap });
reports.create('html').execute(context);
reports.create('text-summary').execute(context);
console.log(
	`[coverage] merged ${kinds.flat().length} report(s) -> ${OUT_DIR}/coverage-final.json, ${OUT_DIR}/report/index.html`
);
