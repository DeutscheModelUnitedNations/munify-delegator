#!/usr/bin/env bun
/**
 * Runs the Playwright e2e suite against the app served under plain Node (not Bun) with V8's
 * built-in coverage recording enabled, then turns the raw coverage into a c8/istanbul report
 * scoped to the backend (src/api).
 *
 * Why Node instead of Bun for the server: V8 coverage collection (what c8 reads) requires the
 * V8 engine; Bun runs on JavaScriptCore and doesn't expose it. `.env` isn't auto-loaded by Node
 * the way Bun auto-loads it, so this passes `--env-file=.env` explicitly.
 *
 * Why report generation runs under `bun` rather than `node`: c8's CLI (via its bundled yargs)
 * currently throws under recent Node (24/25) due to a CJS/ESM module-detection change upstream -
 * unrelated to this project. Bun's module loader doesn't hit that bug, so we invoke c8's JS
 * entrypoint with `bun` for the report step (the dev server itself still runs under `node`,
 * since coverage collection needs the real V8 engine).
 */
import { existsSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const RAW_DIR = 'coverage/e2e-raw';
const REPORT_DIR = 'coverage/e2e-report';

/** A 5xx still means something is listening, so treat anything below it as "up". */
async function serverResponds(url: string): Promise<boolean> {
	try {
		const res = await fetch(url);
		return res.ok || res.status < 500;
	} catch {
		return false; // not up yet
	}
}

async function waitForServer(url: string, timeoutMs: number) {
	const deadline = Date.now() + timeoutMs;
	while (Date.now() < deadline) {
		if (await serverResponds(url)) return;
		await sleep(500);
	}
	throw new Error(`Server did not become ready at ${url} within ${timeoutMs}ms`);
}

if (existsSync(RAW_DIR)) rmSync(RAW_DIR, { recursive: true });
if (existsSync(REPORT_DIR)) rmSync(REPORT_DIR, { recursive: true });

console.log('[e2e-coverage] syncing SvelteKit types...');
await Bun.spawn(['bunx', 'svelte-kit', 'sync'], { stdout: 'inherit', stderr: 'inherit' }).exited;

console.log('[e2e-coverage] starting instrumented dev server under Node...');
const server = Bun.spawn(
	['node', '--env-file=.env', 'node_modules/vite/bin/vite.js', 'dev', '--port', String(PORT)],
	{
		env: { ...process.env, NODE_V8_COVERAGE: RAW_DIR },
		stdout: 'inherit',
		stderr: 'inherit'
	}
);

let exitCode = 0;
try {
	await waitForServer(BASE_URL, 60_000);

	console.log('[e2e-coverage] running Playwright e2e suite...');
	const playwright = Bun.spawn(['bunx', 'playwright', 'test'], {
		stdout: 'inherit',
		stderr: 'inherit'
	});
	exitCode = await playwright.exited;
} finally {
	console.log('[e2e-coverage] stopping server (flushing V8 coverage)...');
	server.kill('SIGTERM');
	await server.exited;
	// V8 writes coverage files asynchronously on exit; give it a moment.
	await sleep(1_000);
}

console.log('[e2e-coverage] generating report scoped to src/api...');
const report = Bun.spawn(
	[
		'bun',
		'node_modules/c8/bin/c8.js',
		'report',
		'--temp-directory',
		RAW_DIR,
		'--reporter=text',
		'--reporter=html',
		'--reporter=json-summary',
		'--reports-dir',
		REPORT_DIR,
		'--include',
		'src/api/**',
		'--exclude',
		'**/*.spec.ts',
		'--exclude',
		'**/*.d.ts'
	],
	{ stdout: 'inherit', stderr: 'inherit' }
);
await report.exited;

console.log(`[e2e-coverage] done. Report: ${REPORT_DIR}/index.html`);
process.exit(exitCode);
