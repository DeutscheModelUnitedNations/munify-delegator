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

// Load environment variables from .env.bugsink
function loadEnv(): { url: string; token: string; projectId: number } {
	const envPath = resolve(import.meta.dir, '../../.env.bugsink');

	if (!existsSync(envPath)) {
		console.error('Error: .env.bugsink not found');
		console.error('Create it with BUGSINK_URL, BUGSINK_TOKEN, and BUGSINK_PROJECT_ID');
		process.exit(1);
	}

	const envContent = readFileSync(envPath, 'utf-8');
	const env: Record<string, string> = {};

	for (const line of envContent.split('\n')) {
		const [key, ...valueParts] = line.split('=');
		if (key && valueParts.length > 0) {
			env[key.trim()] = valueParts.join('=').trim();
		}
	}

	if (!env.BUGSINK_URL || !env.BUGSINK_TOKEN || !env.BUGSINK_PROJECT_ID) {
		console.error('Error: Missing required environment variables');
		console.error('Required: BUGSINK_URL, BUGSINK_TOKEN, BUGSINK_PROJECT_ID');
		process.exit(1);
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
	lines.push(`Status: ${issue.is_resolved ? 'Resolved' : issue.is_muted ? 'Muted' : 'Open'}`);
	lines.push(`First: ${new Date(issue.first_seen).toLocaleString()}`);
	lines.push(`Last:  ${new Date(issue.last_seen).toLocaleString()}`);
	lines.push(`ID: ${issue.id}`);

	return lines.join('\n');
}

async function main() {
	const { values } = parseArgs({
		args: Bun.argv.slice(2),
		options: {
			limit: { type: 'string', default: '10' },
			resolved: { type: 'boolean', default: false },
			output: { type: 'string' },
			verbose: { type: 'boolean', default: false },
			issue: { type: 'string' },
			help: { type: 'boolean', default: false }
		}
	});

	if (values.help) {
		console.log(`
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
`);
		process.exit(0);
	}

	const env = loadEnv();
	const limit = parseInt(values.limit || '10', 10);
	const includeResolved = values.resolved || false;
	const verbose = values.verbose || false;
	const specificIssue = values.issue;

	// If fetching a specific issue
	if (specificIssue) {
		console.log(`Fetching issue ${specificIssue}...`);

		const issue = await fetchFromBugsink<BugsinkIssue>(
			`/api/canonical/0/issues/${specificIssue}/`,
			env
		);

		if (!issue) {
			console.error('Issue not found');
			process.exit(1);
		}

		console.log(formatIssue(issue, 0));

		const events = await fetchIssueEvents(env, specificIssue, 1);
		if (events.length > 0) {
			const stacktrace = await fetchStacktrace(env, events[0].id);
			if (stacktrace) {
				console.log(
					'\n┌─ Stack Trace ─────────────────────────────────────────────────────────────────'
				);
				console.log(stacktrace);
				console.log(
					'└───────────────────────────────────────────────────────────────────────────────'
				);
			}
		}

		return;
	}

	// Fetch all issues
	console.log(`Fetching ${limit} ${includeResolved ? '' : 'unresolved '}issues from ${env.url}...`);
	console.log();

	const issues = await fetchIssues(env, { limit, includeResolved });

	if (issues.length === 0) {
		console.log('No issues found.');
		return;
	}

	console.log(`Found ${issues.length} issues:\n`);

	interface IssueData {
		issue: BugsinkIssue;
		stacktrace?: string | null;
	}

	const fullData: IssueData[] = [];

	for (let i = 0; i < issues.length; i++) {
		const issue = issues[i];
		console.log(formatIssue(issue, i));

		if (verbose) {
			const events = await fetchIssueEvents(env, issue.id, 1);
			if (events.length > 0) {
				const stacktrace = await fetchStacktrace(env, events[0].id);
				if (stacktrace) {
					console.log(
						'\n┌─ Stack Trace ─────────────────────────────────────────────────────────────────'
					);
					console.log(stacktrace);
					console.log(
						'└───────────────────────────────────────────────────────────────────────────────'
					);
					fullData.push({ issue, stacktrace });
				} else {
					fullData.push({ issue });
				}
			} else {
				fullData.push({ issue });
			}
		} else {
			fullData.push({ issue });
		}
	}

	if (values.output) {
		const outputPath = resolve(process.cwd(), values.output);
		writeFileSync(outputPath, JSON.stringify(fullData, null, 2));
		console.log(`\nSaved full data to: ${outputPath}`);
	}

	console.log(`\n${'━'.repeat(80)}`);
	console.log('Summary:');
	console.log(`  Total issues: ${issues.length}`);
	if (!verbose) {
		console.log('  Run with --verbose to see full stack traces');
	}
	console.log('  Run with --output issues.json to save for analysis');
	console.log('  Run with --issue <uuid> to fetch a specific issue');
}

main().catch(console.error);
