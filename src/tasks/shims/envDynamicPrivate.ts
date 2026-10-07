/**
 * Stands in for SvelteKit's `$env/dynamic/private` inside the tasks bundle, which reads the same
 * variables straight off the process. See `scripts/tasksBuild.ts`.
 */
export const env: Record<string, string | undefined> = process.env;
