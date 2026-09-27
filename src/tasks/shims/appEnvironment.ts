/**
 * The tasks bundle runs as a plain Node process, so SvelteKit's `$app/environment` does not
 * exist. `scripts/tasksBuild.ts` aliases it to this module; the values are what a running
 * server would report.
 */
export const browser = false;
export const building = false;
export const dev = process.env.NODE_ENV === 'development';
export const version = '';
