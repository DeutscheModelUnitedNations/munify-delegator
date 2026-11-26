import type { RequestHandler } from './$types';
import { serveScanFolder } from '#api/handlers/postalScan/webdav';

// The WebDAV folder scanners upload to: every method, also WebDAV's own (PROPFIND, MKCOL, …). A file
// larger than BODY_SIZE_LIMIT is read off the Node request (adapter-node's `platform.req`).
export const fallback: RequestHandler = ({ request, url, platform }) =>
	serveScanFolder({ request, path: url.pathname, connection: platform?.req });
