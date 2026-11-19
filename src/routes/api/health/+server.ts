import type { RequestHandler } from './$types';

/**
 * Liveness for the image's `HEALTHCHECK`: answers once the server listens, which is what a rolling
 * update waits for before replacing the next replica. Checks nothing behind it - a database hiccup
 * would otherwise mark every replica unhealthy and have the swarm restart them.
 */
export const GET = (() =>
	new Response('ok', { headers: { 'cache-control': 'no-store' } })) satisfies RequestHandler;
