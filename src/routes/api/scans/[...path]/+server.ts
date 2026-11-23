import type { RequestHandler } from './$types';
import { serveScanFolder } from '#api/handlers/postalScan/webdav';

// The WebDAV folder scanners upload to: every method, also WebDAV's own (PROPFIND, MKCOL, …).
export const fallback: RequestHandler = ({ request, url }) =>
	serveScanFolder({ request, path: url.pathname });
