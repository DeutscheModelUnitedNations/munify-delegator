import { findDeliverer, type Deliverer } from '#api/handlers/scannerAccess/scannerAccessService';
import { mayDeliver } from '#api/handlers/scannerAccess/scannerAccessPermissions';
import { logger } from '#lib/logger';
import { MAX_POSTAL_SCAN_SIZE } from '#lib/paperScan/limits';
import { IntakeBusyError } from './intakeGate';
import { ingestScans, NotAllowedToDeliverError } from './scanIngest';

/**
 * A WebDAV folder to drop scans into, for scanners that upload to one: a scanner login signs in
 * (Basic), what is PUT is taken in, and nothing is ever listed or read back. It answers as much of
 * the protocol as devices ask before they upload: the folder is always there, empty, and any
 * subfolder they make "exists".
 */

const ALLOWED = 'OPTIONS, HEAD, GET, PUT, DELETE, PROPFIND, PROPPATCH, MKCOL, MOVE, LOCK, UNLOCK';

/** How long an upload may take once it is its turn. */
const RECEIVE_MS = 3 * 60_000;

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

/** Refuses to wait for a body for ever, so a stalled upload keeps no place. */
function inTime<T>(body: Promise<T>) {
	return new Promise<T>((resolve, reject) => {
		const timer = setTimeout(() => reject(new IntakeBusyError()), RECEIVE_MS);
		body.then(resolve, reject).finally(() => clearTimeout(timer));
	});
}

async function put({ request, path, deliverer }: FolderRequest) {
	if (Number(request.headers.get('content-length') ?? 0) > MAX_POSTAL_SCAN_SIZE) return answer(413);
	try {
		await ingestScans({
			deliverer,
			// read only once it is its turn: until then it stays with the scanner
			receive: async () => {
				const bytes = new Uint8Array(await inTime(request.arrayBuffer()));
				// devices try the folder with an empty file, or make one before they fill it
				return bytes.length === 0 ? [] : [{ name: nameOf(path), bytes }];
			},
			source: 'WEBDAV'
		});
		return answer(201);
	} catch (error) {
		if (error instanceof IntakeBusyError) return answer(503, { 'Retry-After': '60' });
		if (error instanceof NotAllowedToDeliverError) return answer(403);
		logger.error('Taking in a scan uploaded over WebDAV failed', error);
		return answer(500);
	}
}

interface FolderRequest {
	request: Request;
	path: string;
	deliverer: Deliverer;
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

/** Answers one request to the folder at `path` (as in the URL). */
export async function serveScanFolder({ request, path }: { request: Request; path: string }) {
	if (request.method === 'OPTIONS') return answer(200, { DAV: '1, 2', Allow: ALLOWED });
	const login = basicLogin(request);
	const deliverer = login && (await findDeliverer(login));
	if (!deliverer || !(await mayDeliver(deliverer))) {
		return answer(401, { 'WWW-Authenticate': 'Basic realm="DELEGATOR scans", charset="UTF-8"' });
	}
	if (!Object.hasOwn(ANSWERS, request.method)) return answer(405, { Allow: ALLOWED });
	return ANSWERS[request.method]({ request, path, deliverer });
}
