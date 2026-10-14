#!/usr/bin/env bun
/**
 * Runs the Playwright e2e suite against the app served under plain Node (not Bun) with V8's
 * built-in coverage recording enabled, and records the browser's coverage alongside it
 * (e2e/support/test.ts). scripts/serverCoverage.ts then maps the server's raw coverage back to
 * the sources, and scripts/mergeCoverage.ts folds both, with any unit coverage, into
 * coverage/coverage-final.json - the file `fallow health` scores CRAP with - and an HTML report.
 * Arguments are passed on to `playwright test`.
 *
 * Why Node instead of Bun for the server: V8 coverage collection requires the V8 engine; Bun runs
 * on JavaScriptCore and doesn't expose it. `.env` isn't auto-loaded by Node the way Bun
 * auto-loads it, so this passes `--env-file=.env` explicitly.
 */
/* global Bun -- this script only runs under bun, which provides the Bun global; bun-types is not installed */
import { existsSync, rmSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const PORT = 5173;
const BASE_URL = `http://localhost:${PORT}`;
const RAW_DIR = 'coverage/e2e-raw';
const BROWSER_DIR = 'coverage/e2e-browser';
const SERVER_DIR = 'coverage/e2e-server';

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
if (existsSync(BROWSER_DIR)) rmSync(BROWSER_DIR, { recursive: true });
if (existsSync(SERVER_DIR)) rmSync(SERVER_DIR, { recursive: true });

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

let exitCode: number;
try {
	await waitForServer(BASE_URL, 60_000);

	console.log('[e2e-coverage] running Playwright e2e suite...');
	const playwright = Bun.spawn(['bunx', 'playwright', 'test', ...process.argv.slice(2)], {
		// Read by e2e/support/test.ts, which records the browser's coverage into it
		env: { ...process.env, E2E_BROWSER_COVERAGE_DIR: BROWSER_DIR },
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

console.log('[e2e-coverage] mapping the server coverage back to the sources...');
await Bun.spawn(
	['bun', 'scripts/serverCoverage.ts', RAW_DIR, `${SERVER_DIR}/coverage-final.json`],
	{ stdout: 'inherit', stderr: 'inherit' }
).exited;
await Bun.spawn(['bun', 'scripts/mergeCoverage.ts'], { stdout: 'inherit', stderr: 'inherit' })
	.exited;

process.exit(exitCode);
