#!/usr/bin/env bun
/**
 * Bugsink Issue Fetcher
 *
 * Fetches issues from the Bugsink instance for analysis and debugging.
 *
 * Usage:
 *   bun scripts/bugsink/fetch-issues.ts [options]
 *
 * Options:
 *   --limit <n>      Number of issues to fetch (default: 10)
 *   --resolved       Include resolved issues (default: only unresolved)
 *   --output <file>  Save output to JSON file
 *   --verbose        Show full stack traces
 *   --issue <uuid>   Fetch details for a specific issue
 */

import { parseArgs } from 'util';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const REQUIRED_ENV = ['BUGSINK_URL', 'BUGSINK_TOKEN', 'BUGSINK_PROJECT_ID'];

/** Prints the lines as errors and exits with a failure. */
function fail(...lines: string[]): never {
	for (const line of lines) console.error(line);
	process.exit(1);
}

/** The `KEY=value` lines of an env file; a value may itself contain `=`. */
function parseEnvFile(content: string): Record<string, string> {
	const env: Record<string, string> = {};
	for (const line of content.split('\n')) {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length > 0) {
			env[key.trim()] = valueParts.join('=').trim();
		}
	}
	return env;
}

// Load environment variables from .env.bugsink
function loadEnv(): { url: string; token: string; projectId: number } {
	const envPath = resolve(import.meta.dir, '../../.env.bugsink');

	if (!existsSync(envPath)) {
		fail(
			'Error: .env.bugsink not found',
			'Create it with BUGSINK_URL, BUGSINK_TOKEN, and BUGSINK_PROJECT_ID'
		);
	}

	const env = parseEnvFile(readFileSync(envPath, 'utf-8'));

	if (REQUIRED_ENV.some((name) => !env[name])) {
		fail(
			'Error: Missing required environment variables',
			'Required: BUGSINK_URL, BUGSINK_TOKEN, BUGSINK_PROJECT_ID'
		);
	}

	return {
		url: env.BUGSINK_URL,
		token: env.BUGSINK_TOKEN,
		projectId: parseInt(env.BUGSINK_PROJECT_ID, 10)
	};
}

interface BugsinkIssue {
	id: string;
	project: number;
	digest_order: number;
	last_seen: string;
	first_seen: string;
	digested_event_count: number;
	stored_event_count: number;
	calculated_type: string;
	calculated_value: string;
	transaction: string;
	is_resolved: boolean;
	is_resolved_by_next_release: boolean;
	is_muted: boolean;
}

interface BugsinkEvent {
	id: string;
	issue: string;
	digest_order: number;
	ingested_at: string;
	timestamp: string;
	platform: string;
	release?: string;
	data?: Record<string, unknown>;
}

interface PaginatedResponse<T> {
	next: string | null;
	previous: string | null;
	results: T[];
}

async function fetchFromBugsink<T>(
	endpoint: string,
	env: { url: string; token: string }
): Promise<T | null> {
	const url = `${env.url}${endpoint}`;

	try {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${env.token}`
			}
		});

		if (!response.ok) {
			console.error(`API Error: ${response.status} ${response.statusText}`);
			const text = await response.text();
			console.error(`Response: ${text.substring(0, 500)}`);
			return null;
		}

		return (await response.json()) as T;
	} catch (error) {
		console.error(`Fetch error for ${url}:`, error);
		return null;
	}
}

async function fetchStacktrace(
	env: { url: string; token: string },
	eventId: string
): Promise<string | null> {
	const url = `${env.url}/api/canonical/0/events/${eventId}/stacktrace/`;

	try {
		const response = await fetch(url, {
			headers: {
				Authorization: `Bearer ${env.token}`
			}
		});

		if (!response.ok) {
			return null;
		}

		return await response.text();
	} catch {
		return null;
	}
}

async function fetchIssues(
	env: { url: string; token: string; projectId: number },
	options: { limit: number; includeResolved: boolean }
): Promise<BugsinkIssue[]> {
	const endpoint = `/api/canonical/0/issues/?project=${env.projectId}&sort=last_seen&order=desc`;

	const response = await fetchFromBugsink<PaginatedResponse<BugsinkIssue>>(endpoint, env);
	if (!response) return [];

	let issues = response.results;

	// Filter resolved if needed
	if (!options.includeResolved) {
		issues = issues.filter((i) => !i.is_resolved && !i.is_muted);
	}

	// Limit
	return issues.slice(0, options.limit);
}

async function fetchIssueEvents(
	env: { url: string; token: string },
	issueId: string,
	limit = 1
): Promise<BugsinkEvent[]> {
	const endpoint = `/api/canonical/0/events/?issue=${issueId}&order=desc`;

	const response = await fetchFromBugsink<PaginatedResponse<BugsinkEvent>>(endpoint, env);
	if (!response) return [];

	return response.results.slice(0, limit);
}

function issueStatus(issue: BugsinkIssue) {
	if (issue.is_resolved) return 'Resolved';
	return issue.is_muted ? 'Muted' : 'Open';
}

function formatIssue(issue: BugsinkIssue, index: number): string {
	const lines: string[] = [];

	lines.push(`\n${'━'.repeat(80)}`);
	lines.push(`#${index + 1} │ ${issue.calculated_type || '<unknown>'}`);
	lines.push(`${'━'.repeat(80)}`);

	if (issue.calculated_value) {
		lines.push(`Message: ${issue.calculated_value}`);
	}

	lines.push(`Route: ${issue.transaction}`);
	lines.push(`Events: ${issue.digested_event_count}`);
	lines.push(`Status: ${issueStatus(issue)}`);
	lines.push(`First: ${new Date(issue.first_seen).toLocaleString()}`);
	lines.push(`Last:  ${new Date(issue.last_seen).toLocaleString()}`);
	lines.push(`ID: ${issue.id}`);

	return lines.join('\n');
}

const HELP = `
Bugsink Issue Fetcher

Usage:
  bun scripts/bugsink/fetch-issues.ts [options]

Options:
  --limit <n>      Number of issues to fetch (default: 10)
  --resolved       Include resolved issues (default: only unresolved)
  --output <file>  Save output to JSON file
  --verbose        Show full stack traces for each issue
  --issue <uuid>   Fetch details for a specific issue
  --help           Show this help message

Examples:
  bun scripts/bugsink/fetch-issues.ts --limit 5 --verbose
  bun scripts/bugsink/fetch-issues.ts --issue 47939e95-6263-4eba-ad2f-b69ab29058c1
  bun scripts/bugsink/fetch-issues.ts --output bugs.json
`;

type Env = ReturnType<typeof loadEnv>;

/** The stack trace of an issue's most recent event, if it has one. */
async function latestStacktrace(env: Env, issueId: string) {
	const events = await fetchIssueEvents(env, issueId, 1);
	if (events.length === 0) return null;
	return fetchStacktrace(env, events[0].id);
}

function printStacktrace(stacktrace: string) {
	console.log('\n┌─ Stack Trace ─────────────────────────────────────────────────────────────────');
	console.log(stacktrace);
	console.log('└───────────────────────────────────────────────────────────────────────────────');
}

async function showIssue(env: Env, issueId: string) {
	console.log(`Fetching issue ${issueId}...`);

	const issue = await fetchFromBugsink<BugsinkIssue>(`/api/canonical/0/issues/${issueId}/`, env);
	if (!issue) {
		console.error('Issue not found');
		process.exit(1);
	}

	console.log(formatIssue(issue, 0));

	const stacktrace = await latestStacktrace(env, issueId);
	if (stacktrace) printStacktrace(stacktrace);
}

interface IssueData {
	issue: BugsinkIssue;
	stacktrace?: string | null;
}

/** Prints each issue, with its stack trace when verbose, and collects what was printed. */
async function printIssues(env: Env, issues: BugsinkIssue[], verbose: boolean) {
	const fullData: IssueData[] = [];

	for (const [i, issue] of issues.entries()) {
		console.log(formatIssue(issue, i));

		const stacktrace = verbose ? await latestStacktrace(env, issue.id) : null;
		if (stacktrace) {
			printStacktrace(stacktrace);
			fullData.push({ issue, stacktrace });
		} else {
			fullData.push({ issue });
		}
	}
	return fullData;
}

function parseOptions() {
	const { values } = parseArgs({
		args: process.argv.slice(2),
		options: {
			limit: { type: 'string', default: '10' },
			resolved: { type: 'boolean', default: false },
			output: { type: 'string' },
			verbose: { type: 'boolean', default: false },
			issue: { type: 'string' },
			help: { type: 'boolean', default: false }
		}
	});
	return {
		help: values.help,
		issue: values.issue,
		output: values.output,
		limit: parseInt(values.limit || '10', 10),
		includeResolved: values.resolved || false,
		verbose: values.verbose || false
	};
}

type Options = ReturnType<typeof parseOptions>;

function saveOutput(output: string | undefined, fullData: IssueData[]) {
	if (!output) return;
	const outputPath = resolve(process.cwd(), output);
	writeFileSync(outputPath, JSON.stringify(fullData, null, 2));
	console.log(`\nSaved full data to: ${outputPath}`);
}

function printSummary(issueCount: number, verbose: boolean) {
	console.log(`\n${'━'.repeat(80)}`);
	console.log('Summary:');
	console.log(`  Total issues: ${issueCount}`);
	if (!verbose) {
		console.log('  Run with --verbose to see full stack traces');
	}
	console.log('  Run with --output issues.json to save for analysis');
	console.log('  Run with --issue <uuid> to fetch a specific issue');
}

async function listIssues(env: Env, { limit, includeResolved, verbose, output }: Options) {
	// Fetch all issues
	console.log(`Fetching ${limit} ${includeResolved ? '' : 'unresolved '}issues from ${env.url}...`);
	console.log();

	const issues = await fetchIssues(env, { limit, includeResolved });

	if (issues.length === 0) {
		console.log('No issues found.');
		return;
	}

	console.log(`Found ${issues.length} issues:\n`);

	const fullData = await printIssues(env, issues, verbose);
	saveOutput(output, fullData);
	printSummary(issues.length, verbose);
}

async function main() {
	const options = parseOptions();

	if (options.help) {
		console.log(HELP);
		process.exit(0);
	}

	const env = loadEnv();

	if (options.issue) {
		await showIssue(env, options.issue);
		return;
	}

	await listIssues(env, options);
}

main().catch(console.error);
