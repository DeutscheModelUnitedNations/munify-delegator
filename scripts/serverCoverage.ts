#!/usr/bin/env bun
/**
 * Turns the V8 coverage `vite dev` recorded under Node (`NODE_V8_COVERAGE`) into an Istanbul
 * report of the app's own server-side modules.
 *
 * c8 cannot do this by itself: Vite's module runner evaluates every module it transformed through
 * `new AsyncFunction(…)`, which Node keeps no source map for, so c8 would report the transformed
 * code's offsets against the original files. Instead the transform is asked for again here -
 * `fetchModule` returns exactly the code the runner evaluated, with Vite's source map inlined -
 * and v8-to-istanbul maps it back, skipping the function header the runner wraps it in.
 *
 * Run it right after the coverage run, while the sources still match what was executed.
 */
import { readdirSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import libCoverage from 'istanbul-lib-coverage';
import v8ToIstanbul from 'v8-to-istanbul';
import { createServer, fetchModule } from 'vite';
import { isMeasured } from './coverageScope';

interface V8ScriptCoverage {
	url: string;
	functions: Parameters<ReturnType<typeof v8ToIstanbul>['applyCoverage']>[0];
}

const [rawDir = 'coverage/e2e-raw', outFile = 'coverage/e2e-server/coverage-final.json'] =
	process.argv.slice(2);
const root = process.cwd();

/** What Vite's ESModulesEvaluator puts before a module's code (see its `runInlinedModule`). */
function wrapperPrefix() {
	const AsyncFunction: new (...args: string[]) => () => Promise<void> = Object.getPrototypeOf(
		async function () {}
	).constructor;
	const params = [
		'__vite_ssr_exports__',
		'__vite_ssr_import_meta__',
		'__vite_ssr_import__',
		'__vite_ssr_dynamic_import__',
		'__vite_ssr_exportAll__',
		'__vite_ssr_exportName__'
	];
	const marker = '/*code*/';
	const source = String(new AsyncFunction(...params, `"use strict";\n${marker}`));
	return `(${source.slice(0, source.indexOf(marker))}`;
}

/** The scripts one raw V8 coverage file recorded. */
function recordedScripts(file: string): V8ScriptCoverage[] {
	const { result } = JSON.parse(readFileSync(join(rawDir, file), 'utf8')) as {
		result: V8ScriptCoverage[];
	};
	return result;
}

/** Every recorded run of the app's own modules, grouped by file. */
function scriptsByFile() {
	const byFile = new Map<string, V8ScriptCoverage[]>();
	const scripts = readdirSync(rawDir).flatMap(recordedScripts);
	for (const script of scripts.filter((recorded) => isMeasured(recorded.url, root))) {
		byFile.set(script.url, [...(byFile.get(script.url) ?? []), script]);
	}
	return byFile;
}

const server = await createServer({
	server: { middlewareMode: true, hmr: false, watch: null },
	appType: 'custom',
	logLevel: 'error'
});
const map = libCoverage.createCoverageMap({});
const wrapperLength = wrapperPrefix().length;

try {
	for (const [file, scripts] of scriptsByFile()) {
		const fetched = await fetchModule(server.environments.ssr, `/${relative(root, file)}`);
		if (!('code' in fetched) || !fetched.code) continue;
		const converter = v8ToIstanbul(file, wrapperLength, { source: fetched.code });
		await converter.load();
		for (const script of scripts) converter.applyCoverage(script.functions);
		map.merge(converter.toIstanbul());
		converter.destroy();
	}
} finally {
	await server.close();
}

mkdirSync(join(outFile, '..'), { recursive: true });
writeFileSync(outFile, JSON.stringify(map.toJSON()));
console.log(`[server-coverage] ${map.files().length} files -> ${outFile}`);
// The dev server's plugins (oidc-mock among them) keep handles open past `close()`.
process.exit(0);
