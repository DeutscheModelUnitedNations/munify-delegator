import { findDeliverer, type Deliverer } from '#api/handlers/scannerAccess/scannerAccessService';
import { mayDeliver } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import { logger } from '#lib/logger';
import { MAX_SCAN_FILE_SIZE } from '#lib/paperScan/limits';
import { IntakeBusyError } from './intakeGate';
import { ingestScan, NotAllowedToDeliverError, ScanRefusedError } from './scanIngest';

/**
 * A WebDAV folder to drop scans into, for scanners that upload to one: a scanner login signs in
 * (Basic), what is PUT is taken in, and nothing is ever listed or read back. It answers as much of
 * the protocol as devices ask before they upload: the folder is always there, empty, and any
 * subfolder they make "exists".
 */

const ALLOWED = 'OPTIONS, HEAD, GET, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, MOVE, LOCK, UNLOCK';

/** An upload of which nothing comes for so long is given up. */
const SILENCE_MS = 60_000;

const answer = (status: number, headers: Record<string, string> = {}) =>
	new Response(null, { status, headers });

/** The login in a request's `Authorization: Basic`. */
function basicLogin(request: Request) {
	const [scheme, encoded] = (request.headers.get('authorization') ?? '').split(' ');
	if (scheme.toLowerCase() !== 'basic' || !encoded) return undefined;
	const decoded = Buffer.from(encoded, 'base64').toString('utf8');
	const colon = decoded.indexOf(':');
	if (colon < 0) return undefined;
	return { username: decoded.slice(0, colon), password: decoded.slice(colon + 1) };
}

const escapeXml = (text: string) => text.replace(/[<>&"']/g, (char) => `&#${char.charCodeAt(0)};`);

/** An empty folder at `path`, as PROPFIND asks. */
function emptyFolder(path: string) {
	const body = `<?xml version="1.0" encoding="utf-8"?>
<D:multistatus xmlns:D="DAV:"><D:response><D:href>${escapeXml(path)}</D:href><D:propstat><D:prop><D:displayname>Scans</D:displayname><D:resourcetype><D:collection/></D:resourcetype></D:prop><D:status>HTTP/1.1 200 OK</D:status></D:propstat></D:response></D:multistatus>`;
	return new Response(body, {
		status: 207,
		headers: { 'Content-Type': 'application/xml; charset=utf-8' }
	});
}

/** A lock, for clients that take one before they write. Nothing is held: names never clash here. */
function lock() {
	const token = `urn:uuid:${crypto.randomUUID()}`;
	const body = `<?xml version="1.0" encoding="utf-8"?>
<D:prop xmlns:D="DAV:"><D:lockdiscovery><D:activelock><D:locktype><D:write/></D:locktype><D:lockscope><D:exclusive/></D:lockscope><D:depth>0</D:depth><D:timeout>Second-600</D:timeout><D:locktoken><D:href>${token}</D:href></D:locktoken></D:activelock></D:lockdiscovery></D:prop>`;
	return new Response(body, {
		status: 200,
		headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Lock-Token': `<${token}>` }
	});
}

/** What a file is called, from the path it is PUT to. */
function nameOf(path: string) {
	const last = path.split('/').filter(Boolean).at(-1) ?? 'scan';
	try {
		return decodeURIComponent(last);
	} catch {
		return last;
	}
}

/**
 * The Node request a body is read off when SvelteKit refused it: `BODY_SIZE_LIMIT` holds for every route,
 * and a scan may be far larger. It refuses one said to be larger before it reads anything, so then nothing
 * else reads the connection, and it is read here. One it took on (smaller, or of no said length) is read
 * through `request.body`, which it ends with a 413 past the limit.
 */
export type Connection = { listenerCount(event: string): number } & AsyncIterable<Uint8Array> & {
		readableEnded: boolean;
		destroyed: boolean;
	};

/** Whether nothing reads `connection` yet: SvelteKit refused the body without touching it. */
const untouched = (connection: Connection | undefined): connection is Connection =>
	connection !== undefined &&
	connection.listenerCount('data') === 0 &&
	!connection.readableEnded &&
	!connection.destroyed;

/** A request's body as it comes in. One that stops coming is given up, so it keeps no place. */
async function* bodyOf({
	request,
	connection
}: {
	request: Request;
	connection?: Connection;
}): AsyncGenerator<Uint8Array> {
	const chunks: AsyncIterable<Uint8Array> | null = untouched(connection)
		? connection
		: request.body;
	if (!chunks) return;
	const iterator = chunks[Symbol.asyncIterator]();
	let silence: ReturnType<typeof setTimeout> | undefined;
	try {
		for (;;) {
			const next = iterator.next();
			// one timer, wound up again for each part: a large file comes in hundreds of thousands
			const { done, value } = await new Promise<IteratorResult<Uint8Array>>((resolve, reject) => {
				if (silence) silence.refresh();
				else silence = setTimeout(() => reject(new IntakeBusyError()), SILENCE_MS);
				next.then(resolve, reject);
			});
			if (done) return;
			yield value;
		}
	} finally {
		clearTimeout(silence);
		// what is left is not waited for; all of it read, this is nothing
		void Promise.resolve(iterator.return?.()).catch(() => undefined);
	}
}

/** SvelteKit's refusal of a body larger than `BODY_SIZE_LIMIT`, as the stream it took on fails with. */
const isTooLarge = (error: unknown) =>
	error instanceof Error && 'status' in error && error.status === 413;

async function put({ request, path, deliverer, connection }: FolderRequest) {
	if (Number(request.headers.get('content-length') ?? 0) > MAX_SCAN_FILE_SIZE) return answer(413);
	try {
		// read only once it is its turn: until then it stays with the scanner
		await ingestScan({
			deliverer,
			open: () => ({ name: nameOf(path), body: bodyOf({ request, connection }) })
		});
		return answer(201);
	} catch (error) {
		if (error instanceof IntakeBusyError) return answer(503, { 'Retry-After': '60' });
		if (error instanceof NotAllowedToDeliverError) return answer(403);
		if (error instanceof ScanRefusedError) return answer(error.status);
		if (isTooLarge(error)) return answer(413);
		logger.error('Taking in a scan uploaded over WebDAV failed', error);
		return answer(500);
	}
}

interface FolderRequest {
	request: Request;
	path: string;
	deliverer: Deliverer;
	connection?: Connection;
}

/** What each method is answered, once signed in. */
const ANSWERS: Record<string, (args: FolderRequest) => Response | Promise<Response>> = {
	PUT: put,
	// a file is not there (yet), any folder is
	PROPFIND: ({ path }) => (/\.[a-z0-9]{1,5}$/i.test(path) ? answer(404) : emptyFolder(path)),
	PROPPATCH: ({ path }) => emptyFolder(path),
	MKCOL: () => answer(201),
	MOVE: () => answer(201),
	LOCK: () => lock(),
	UNLOCK: () => answer(204),
	DELETE: () => answer(204),
	HEAD: () => answer(404),
	GET: () => answer(404)
};

/**
 * Answers one request to the folder at `path` (as in the URL). `connection` is the Node request under it
 * (adapter-node's `platform.req`), which a body too large for SvelteKit is read off.
 */
export async function serveScanFolder({
	request,
	path,
	connection
}: {
	request: Request;
	path: string;
	connection?: Connection;
}) {
	if (request.method === 'OPTIONS') return answer(200, { DAV: '1, 2', Allow: ALLOWED });
	const login = basicLogin(request);
	const deliverer = login && (await findDeliverer(login));
	if (!deliverer || !(await mayDeliver(deliverer))) {
		return answer(401, { 'WWW-Authenticate': 'Basic realm="DELEGATOR scans", charset="UTF-8"' });
	}
	if (!Object.hasOwn(ANSWERS, request.method)) return answer(405, { Allow: ALLOWED });
	return ANSWERS[request.method]({ request, path, deliverer, connection });
}
